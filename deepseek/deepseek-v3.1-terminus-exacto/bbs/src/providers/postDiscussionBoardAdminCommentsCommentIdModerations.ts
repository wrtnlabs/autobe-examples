import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentModerationTransformer } from "../transformers/DiscussionBoardCommentModerationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminCommentsCommentIdModerations(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentModeration.ICreate;
}): Promise<IDiscussionBoardCommentModeration> {
  // Validate that path parameter commentId matches request body comment ID
  if (props.body.discussion_board_comment_id !== props.commentId) {
    throw new HttpException("Comment ID mismatch", 400);
  }
  // Verify the comment exists
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Create moderation record with proper admin reference
  const moderation =
    await MyGlobal.prisma.discussion_board_comment_moderations.create({
      data: {
        id: v4(),
        action_type: props.body.action_type,
        reason: props.body.reason,
        status: props.body.status ?? "completed",
        created_at: new Date(),
        updated_at: new Date(),
        comment: { connect: { id: props.commentId } },
        admin: { connect: { id: props.admin.id } },
      },
      ...DiscussionBoardCommentModerationTransformer.select(),
    });
  // Transform and return the created record
  return await DiscussionBoardCommentModerationTransformer.transform(
    moderation,
  );
}
