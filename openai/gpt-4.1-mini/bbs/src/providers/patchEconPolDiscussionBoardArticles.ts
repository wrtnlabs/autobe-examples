import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardArticle";
import { IPageIEconPolDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";

export async function patchEconPolDiscussionBoardArticles(props: {
  body: IEconPolDiscussionBoardArticle.IRequest;
}): Promise<IPageIEconPolDiscussionBoardArticle.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
  } as {
    deleted_at: null;
    OR?: Array<
      | { title: { contains: string; mode: "insensitive" } }
      | { member: { username: { contains: string; mode: "insensitive" } } }
    >;
  };

  if (props.body.search) {
    where.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      {
        member: {
          username: { contains: props.body.search, mode: "insensitive" },
        },
      },
    ];
  }

  const [articles, total] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_articles.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }),
    MyGlobal.prisma.econ_pol_discussion_board_articles.count({ where }),
  ]);

  return {
    data: articles.map((article) => ({
      id: article.id,
      title: article.title,
      author: {
        id: article.member.id,
        username: article.member.username,
        displayName: article.member.username,
        memberSince: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      },
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
