import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorDiscussionBoardPostsDiscussionBoardPostIdDiscussionBoardRepliesDiscussionBoardReplyId(props: {
  moderator: ModeratorPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
  discussionBoardReplyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { discussionBoardPostId, discussionBoardReplyId } = props;

  const reply = await MyGlobal.prisma.discussion_board_replies.findUnique({
    where: { id: discussionBoardReplyId },
  });

  if (!reply) {
    throw new HttpException("Reply not found", 404);
  }

  if (reply.post_id !== discussionBoardPostId) {
    throw new HttpException("Reply does not belong to the specified post", 404);
  }

  await MyGlobal.prisma.discussion_board_replies.delete({
    where: { id: discussionBoardReplyId },
  });
}
