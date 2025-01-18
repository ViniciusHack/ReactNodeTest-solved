const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');
const User = require('../../model/schema/user');

const index = async (req, res) => {
    try {
        const query = { ...req.query, deleted: false };

        // Handle permissions for non-admin users
        const user = await User.findById(req.user.userId);
        if (user?.role !== "superAdmin") {
            delete query.createBy;
            query.$or = [
                { createBy: new mongoose.Types.ObjectId(req.user.userId) },
                { attendes: new mongoose.Types.ObjectId(req.user.userId) }
            ];
        }

        const result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'creator'
                }
            },
            {
                $lookup: {
                    from: 'Contact',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Lead',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
            { $match: { 'creator.deleted': false } },
            {
                $addFields: {
                    createdByName: { $concat: ['$creator.firstName', ' ', '$creator.lastName'] }
                }
            },
            {
                $project: {
                    creator: 0
                }
            }
        ]);

        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to fetch meetings:', err);
        res.status(400).json({ error: 'Failed to fetch meetings' });
    }
}

const add = async (req, res) => {
    try {
        const meeting = new MeetingHistory({
            ...req.body,
            timestamp: new Date(),
            createBy: req.user.userId
        });
        await meeting.save();
        res.status(200).json(meeting);
    } catch (err) {
        console.error('Failed to create meeting:', err);
        res.status(400).json({ error: 'Failed to create meeting' });
    }
}

const view = async (req, res) => {
    try {
        const result = await MeetingHistory.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'creator'
                }
            },
            {
                $lookup: {
                    from: 'Contact',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'attendes'
                }
            },
            {
                $lookup: {
                    from: 'Lead',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'attendesLead'
                }
            },
            { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    createdByName: { $concat: ['$creator.firstName', ' ', '$creator.lastName'] }
                }
            },
            {
                $project: {
                    creator: 0
                }
            }
        ]);

        if (!result[0]) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.status(200).json(result[0]);
    } catch (err) {
        console.error('Failed to fetch meeting:', err);
        res.status(400).json({ error: 'Failed to fetch meeting' });
    }
}

const edit = async (req, res) => {
    try {
        const result = await MeetingHistory.findOneAndUpdate(
            { _id: req.params.id },
            { 
                $set: {
                    ...req.body,
                    timestamp: new Date()
                }
            },
            { new: true }
        );
        
        if (!result) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.status(200).json(result);
    } catch (err) {
        console.error('Failed to update meeting:', err);
        res.status(400).json({ error: 'Failed to update meeting' });
    }
}

const deleteData = async (req, res) => {
    try {
        const result = await MeetingHistory.findByIdAndUpdate(
            req.params.id,
            { deleted: true },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        res.status(200).json({ message: "Meeting deleted successfully", result });
    } catch (err) {
        console.error('Failed to delete meeting:', err);
        res.status(400).json({ error: 'Failed to delete meeting' });
    }
}

const deleteMany = async (req, res) => {
    try {
        const result = await MeetingHistory.updateMany(
            { _id: { $in: req.body } },
            { $set: { deleted: true } }
        );

        res.status(200).json({ 
            message: "Meetings deleted successfully",
            deletedCount: result.modifiedCount
        });
    } catch (err) {
        console.error('Failed to delete meetings:', err);
        res.status(400).json({ error: 'Failed to delete meetings' });
    }
}

module.exports = { add, index, view, edit, deleteData, deleteMany }