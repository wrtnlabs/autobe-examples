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

export async function postDiscussionBoardMemberDiscussionBoardPostsPostIdDiscussionBoardReplies(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardReply.ICreate;
}): Promise<IDiscussionBoardDiscussionBoardReply> {
  const { member, postId, body } = props;

  if (member.id !== body.member_id) {
    throw new HttpException("Forbidden: member_id mismatch", 403);
  }

  if (postId !== body.post_id) {
    throw new HttpException(
      "Bad Request: postId parameter does not match body.post_id",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_replies.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      content: body.content,
      reply_status: body.reply_status,
      created_at: now,
      updated_at: now,
      post: { connect: { id: body.post_id } },
      member: { connect: { id: body.member_id } },
    },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    member_id: created.member_id,
    content: created.content,
    reply_status: created.reply_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: undefined,
  };
}
