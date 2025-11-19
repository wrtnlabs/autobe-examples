import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberDiscussionBoardComments(props: {
  member: MemberPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const {
    discussion_board_article_id,
    discussion_board_member_id,
    content,
    created_at_start,
    created_at_end,
    page = 1,
    limit = 20,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(discussion_board_article_id && { discussion_board_article_id }),
    ...(discussion_board_member_id && { discussion_board_member_id }),
    ...(content && { content: { contains: content } }),
    ...((created_at_start || created_at_end) && {
      created_at: {
        ...(created_at_start && { gte: created_at_start }),
        ...(created_at_end && { lte: created_at_end }),
      },
    }),
  };

  const orderBy = {
    [sort_by]: sort_order,
  };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        author: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((c) => ({
      id: c.id,
      author: {
        id: c.author.id,
        username: c.author.email,
        displayName: c.author.nickname,
      },
      content: c.content,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
      discussion_board_article_id: c.discussion_board_article_id,
    })),
  };
}
