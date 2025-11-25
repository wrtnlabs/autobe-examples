import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticles } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticles";
import { IPageIDiscussionBoardArticles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticles";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberDiscussionBoardArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticles.IRequest;
}): Promise<IPageIDiscussionBoardArticles.ISummary> {
  const { member, body } = props;
  const page = body.page > 0 ? body.page : 1;
  const limit = body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  const where: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };

  if (body.search) {
    where.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { content: { contains: body.search, mode: "insensitive" } },
    ];
  }

  if (body.authorId) {
    where.discussion_board_member_id = body.authorId;
  }

  const orderBy: Prisma.Enumerable<Prisma.discussion_board_articlesOrderByWithRelationInput> =
    {};

  const allowedSortFields = ["created_at", "updated_at", "title"] as const;

  if (
    body.sortBy &&
    (allowedSortFields as readonly string[]).includes(body.sortBy)
  ) {
    const sortKey = body.sortBy as (typeof allowedSortFields)[number];
    const direction =
      body.sortDirection && ["asc", "desc"].includes(body.sortDirection)
        ? body.sortDirection
        : "desc";
    orderBy[sortKey] = direction;
  } else {
    orderBy.created_at = "desc";
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        title: true,
        discussion_board_member_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: data.map(() => ({})),
  };
}
