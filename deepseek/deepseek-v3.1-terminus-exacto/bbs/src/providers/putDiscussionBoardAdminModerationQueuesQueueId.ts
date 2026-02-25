import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload"
import { DiscussionBoardContentModerationQueueAssignmentTransformer } from "../transformers/DiscussionBoardContentModerationQueueAssignmentTransformer"

export async function putDiscussionBoardAdminModerationQueuesQueueId(props: {
    admin: AdminPayload;
    queueId: string & tags.Format;
    "uuid">;;
    body: IDiscussionBoardContentModerationQueueAssignment.IUpdate;
}): Promise<IDiscussionBoardContentModerationQueueAssignment> {
    // Verify the queue exists and validate admin permissions
    const existingQueue = await MyGlobal.prisma.discussion_board_content_moderation_queues.findUniqueOrThrow({
        where: { id: props.queueId },
    });
    // Validate enum values
    const validStatusValues = [];
    "pending",;
    "under_review",;
    "escalated",;
    "resolved",;
    "dismissed",;
    ;
    const validPriorityValues = ["low", "medium", "high", "critical"];];
    if (props.body.moderation_status !== undefined &&
        !validStatusValues.includes(props.body.moderation_status)) {
        throw new HttpException(`Invalid moderation_status value: ${props.body.moderation_status}`, 400);
    }
    if (props.body.priority_level !== undefined &&
        !validPriorityValues.includes(props.body.priority_level)) {
        throw new HttpException(`Invalid priority_level value: ${props.body.priority_level}`, 400);
    }
    // Build update data with proper typing
    const updateData = {
        updated_at: toISOStringSafe(new Date()),
        ...(props.body.moderation_status !== undefined && {
            moderation_status: props.body.moderation_status,
        }),
        ...(props.body.priority_level !== undefined && {
            priority_level: props.body.priority_level,
        }),
        ...(props.body.escalation_reason !== undefined && {
            escalation_reason: props.body.escalation_reason,
            escalated_by_admin_id: props.admin.id,
        }),
        ...(props.body.assignment_history_count !== undefined && {
            assignment_history_count: props.body.assignment_history_count,
        }),
        ...(props.body.auto_flagged !== undefined && {
            auto_flagged: props.body.auto_flagged,
        }),
    } satisfies Prisma.discussion_board_content_moderation_queuesUpdateInput;
    // Handle assignment changes separately to track history
    if (props.body.assigned_admin_id !== undefined) {
        // Verify the assigned admin exists and is active
        if (props.body.assigned_admin_id !== null) {
            await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
                where: {
                    id: props.body.assigned_admin_id,
                    deleted_at: null,
                },
            });
        }
        // Use direct scalar assignment instead of relation syntax
        const assignmentUpdate: Prisma.discussion_board_content_moderation_queuesUpdateInput = {
            assigned_admin_id: props.body.assigned_admin_id,
            assigned_at: toISOStringSafe(new Date()),
        };
        // Merge with existing updateData
        Object.assign(updateData, assignmentUpdate);
        // Only increment history count if assignment actually changed
        if (existingQueue.assigned_admin_id !== props.body.assigned_admin_id) {
            updateData.assignment_history_count =
                (existingQueue.assignment_history_count ?? 0) + 1;
        }
    }
    // Handle resolved_at based on status changes
    if (props.body.moderation_status === )
        ;
    "resolved" &&;
    existingQueue.moderation_status !== ;
    "resolved";
    {
        const resolvedUpdate: Prisma.discussion_board_content_moderation_queuesUpdateInput = {
            resolved_at: toISOStringSafe(new Date()),
        };
        Object.assign(updateData, resolvedUpdate);
    }
    if (props.body.moderation_status !== )
        ;
    "resolved" &&;
    existingQueue.moderation_status === ;
    "resolved";
    {
        const resolvedNullUpdate: Prisma.discussion_board_content_moderation_queuesUpdateInput = {
            resolved_at: null,
        };
        Object.assign(updateData, resolvedNullUpdate);
    }
    // Perform the update
    const updatedQueue = await MyGlobal.prisma.discussion_board_content_moderation_queues.update({
        where: { id: props.queueId },
        data: updateData,
        ...DiscussionBoardContentModerationQueueAssignmentTransformer.select(),
    });
    return await DiscussionBoardContentModerationQueueAssignmentTransformer.transform(updatedQueue);
}
