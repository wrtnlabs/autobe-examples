import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const {
    search,
    discussion_board_member_id,
    created_at_from,
    created_at_to,
    sort_by,
    sort_order,
    page,
    limit,
  } = props.body;

  const currentPage = page ?? 1;
  const pageLimit = limit ?? 100;
  const skip = (currentPage - 1) * pageLimit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    if (search) {
      conditions.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
      ];
    }

    if (discussion_board_member_id) {
      conditions.discussion_board_member_id = discussion_board_member_id;
    }

    if (created_at_from || created_at_to) {
      conditions.created_at = {};
      if (created_at_from) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          created_at_from,
        );
      }
      if (created_at_to) {
        (conditions.created_at as Record<string, unknown>).lte = new Date(
          created_at_to,
        );
      }
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where: whereCondition,
      orderBy: sort_by
        ? {
            [sort_by]: sort_order ?? "desc",
          }
        : { created_at: "desc" },
      skip,
      take: pageLimit,
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: whereCondition,
    }),
  ]);

  const memberMap = new Map(
    (
      await MyGlobal.prisma.discussion_board_members.findMany({
        where: {
          id: {
            in: [...new Set(articles.map((a) => a.discussion_board_member_id))],
          },
        },
      })
    ).map((m) => [m.id, m]),
  );

  const totalPages = Math.ceil(totalCount / pageLimit);

  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: totalCount,
      pages: totalPages,
    },
    data: articles.map((article) => {
      const member = memberMap.get(article.discussion_board_member_id);
      if (!member) {
        throw new HttpException("Author not found", 404);
      }
      return {
        id: article.id,
        title: article.title,
        view_count: article.view_count,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        author: {
          id: member.id,
          username: member.username,
          email: member.email,
          status: member.status,
          email_verified: member.email_verified,
          created_at: toISOStringSafe(member.created_at),
        },
      };
    }),
  };
}
