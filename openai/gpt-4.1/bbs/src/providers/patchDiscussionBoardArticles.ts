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
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function patchDiscussionBoardArticles(props: {
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const {
    keyword,
    author_user_id,
    author_admin_id,
    created_from,
    created_until,
    is_active,
    sort_by,
    sort_direction,
    page,
    limit,
  } = props.body ?? {};

  const effectiveLimit = Math.max(1, Math.min(limit ?? 100, 100));
  const effectivePage = Math.max(1, page ?? 1);
  const skip = (effectivePage - 1) * effectiveLimit;

  const where: Record<string, any> = {};
  if (is_active !== false) {
    where["deleted_at"] = null;
  }
  if (author_user_id) where["author_user_id"] = author_user_id;
  if (author_admin_id) where["author_admin_id"] = author_admin_id;
  if (created_from) {
    where["created_at"] = where["created_at"] || {};
    where["created_at"].gte = created_from;
  }
  if (created_until) {
    where["created_at"] = where["created_at"] || {};
    where["created_at"].lte = created_until;
  }
  if (keyword) {
    where["OR"] = [
      { title: { contains: keyword, mode: "insensitive" } },
      { body: { contains: keyword, mode: "insensitive" } },
    ];
  }
  let orderBy: any;
  if (sort_by === "created_at" || !sort_by) {
    orderBy = { created_at: sort_direction === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { created_at: sort_direction === "asc" ? "asc" : "desc" };
  }
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.findMany({
      where,
      orderBy,
      skip,
      take: effectiveLimit,
      include: {
        authorUser: {
          select: {
            id: true,
            email: true,
            is_email_verified: true,
            is_active: true,
            is_blocked: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        authorAdmin: {
          select: {
            id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_articles.count({ where }),
  ]);
  const data = rows
    .map((article) => {
      let author:
        | IDiscussionBoardUser.ISummary
        | IDiscussionBoardAdmin.ISummary
        | undefined = undefined;
      if (article.author_user_id && article.authorUser) {
        const user = article.authorUser;
        author = {
          id: user.id,
          email: user.email,
          is_email_verified: user.is_email_verified,
          is_active: user.is_active,
          is_blocked: user.is_blocked,
          created_at: toISOStringSafe(user.created_at),
          updated_at: toISOStringSafe(user.updated_at),
          deleted_at:
            user.deleted_at !== null && user.deleted_at !== undefined
              ? toISOStringSafe(user.deleted_at)
              : undefined,
        };
      } else if (article.author_admin_id && article.authorAdmin) {
        const admin = article.authorAdmin;
        author = {
          id: admin.id,
          display_name: "Admin",
        };
      }
      if (!author) return undefined;
      return {
        id: article.id,
        title: article.title,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        author: author,
      };
    })
    .filter((item): item is IDiscussionBoardArticle.ISummary => !!item)
    .filter((row) => {
      if (is_active === true || is_active === undefined) {
        if (
          "deleted_at" in row.author &&
          row.author.deleted_at !== undefined &&
          row.author.deleted_at !== null
        )
          return false;
      }
      return true;
    });
  return {
    pagination: {
      current: effectivePage,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    },
    data,
  };
}
