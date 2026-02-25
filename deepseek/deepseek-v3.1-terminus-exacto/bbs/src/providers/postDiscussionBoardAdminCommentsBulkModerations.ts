import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentModerationCollector } from "../collectors/DiscussionBoardCommentModerationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminCommentsBulkModerations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardCommentModeration.ICreate[];
}): Promise<IDiscussionBoardCommentModeration.IBulkResult> {
  const successfulItems: IDiscussionBoardCommentModeration.ISummary[] = [];
  const failedItems: IDiscussionBoardCommentModeration.IBulkFailure[] = [];
  // Validate admin exists
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.admin.id },
  });
  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }
  // Process each moderation request in a transaction
  for (const moderationRequest of props.body) {
    try {
      // Validate that the comment exists
      const comment =
        await MyGlobal.prisma.discussion_board_comments.findUnique({
          where: { id: moderationRequest.discussion_board_comment_id },
        });
      if (!comment) {
        throw new HttpException("Comment not found", 404);
      }
      // Create moderation record using collector
      const moderationRecord =
        await DiscussionBoardCommentModerationCollector.collect({
          body: moderationRequest,
          discussionBoardAdmins: { id: props.admin.id },
        });
      const createdModeration =
        await MyGlobal.prisma.discussion_board_comment_moderations.create({
          data: moderationRecord,
          include: {
            admin: {
              select: {
                id: true,
                email: true,
                display_name: true,
                created_at: true,
              },
            },
          },
        });
      successfulItems.push({
        id: createdModeration.id,
        action_type: createdModeration.action_type,
        reason: createdModeration.reason,
        status: createdModeration.status,
        created_at: toISOStringSafe(createdModeration.created_at),
        admin: {
          id: createdModeration.admin.id,
          email: createdModeration.admin.email,
          display_name: createdModeration.admin.display_name,
          created_at: toISOStringSafe(createdModeration.admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary,
      });
    } catch (error) {
      failedItems.push({
        discussion_board_comment_id:
          moderationRequest.discussion_board_comment_id,
        error_message:
          error instanceof HttpException
            ? error.message
            : "Internal server error",
      });
    }
  }
  return {
    total_processed: props.body.length,
    successful_count: successfulItems.length,
    failed_count: failedItems.length,
    successful_items: successfulItems,
    failed_items: failedItems,
  };
}
