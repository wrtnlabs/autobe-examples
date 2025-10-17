import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberDiscussionBoardPostsPostIdDiscussionBoardRepliesReplyId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  replyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDiscussionBoardReply> {
  const { member, postId, replyId } = props;

  // Find the reply with matching replyId and postId, excluding soft deleted
  const reply = await MyGlobal.prisma.discussion_board_replies.findFirstOrThrow(
    {
      where: {
        id: replyId,
        post_id: postId,
        deleted_at: null,
      },
    },
  );

  return {
    id: reply.id,
    post_id: reply.post_id,
    member_id: reply.member_id,
    content: reply.content,
    reply_status: reply.reply_status,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    deleted_at:
      reply.deleted_at === null || reply.deleted_at === undefined
        ? undefined
        : toISOStringSafe(reply.deleted_at),
  };
}
