import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReplies";
import { IPageIDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardReplies";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberDiscussionBoardPostsDiscussionBoardPostIdDiscussionBoardReplies(props: {
  member: MemberPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardReplies.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardReplies.ISummary> {
  const { member, discussionBoardPostId, body } = props;

  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: discussionBoardPostId,
      deleted_at: null,
    },
  });

  if (post === null) {
    throw new HttpException("Discussion board post not found", 404);
  }

  const page = body.page < 1 ? 1 : body.page;
  const limit = body.limit < 1 ? 10 : body.limit;
  const skip = (page - 1) * limit;

  const whereCondition = {
    post_id: discussionBoardPostId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        content: {
          contains: body.search,
        },
      }),
  };

  const orderByField =
    body.sort === "updated_at" || body.sort === "created_at"
      ? body.sort
      : "created_at";
  const orderByDirection =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  const [replies, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_replies.findMany({
      where: whereCondition,
      orderBy: {
        [orderByField]: orderByDirection,
      },
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        member_id: true,
        content: true,
        reply_status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_replies.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: replies.map((reply) => ({
      id: reply.id,
      post_id: reply.post_id,
      member_id: reply.member_id,
      content: reply.content,
      reply_status: reply.reply_status,
      created_at: toISOStringSafe(reply.created_at),
      updated_at: toISOStringSafe(reply.updated_at),
    })),
  };
}
