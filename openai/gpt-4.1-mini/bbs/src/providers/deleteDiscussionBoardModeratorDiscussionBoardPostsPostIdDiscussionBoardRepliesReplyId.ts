import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorDiscussionBoardPostsPostIdDiscussionBoardRepliesReplyId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId, replyId } = props;

  // Verify moderator authorization
  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { id: moderator.id, deleted_at: null },
    });
  if (moderatorRecord === null)
    throw new HttpException("Forbidden: Moderator not authorized", 403);

  // Verify reply exists and belongs to the specified post
  const existingReply =
    await MyGlobal.prisma.discussion_board_replies.findFirst({
      where: { id: replyId, post_id: postId, deleted_at: null },
    });
  if (existingReply === null) throw new HttpException("Reply not found", 404);

  // Delete the reply (hard delete)
  await MyGlobal.prisma.discussion_board_replies.delete({
    where: { id: replyId },
  });
}
