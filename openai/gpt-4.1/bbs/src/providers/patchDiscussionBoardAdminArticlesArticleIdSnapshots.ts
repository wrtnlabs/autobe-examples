import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminArticlesArticleIdSnapshots(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot> {
  // 1. Confirm article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
    select: { id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Construct filter for search criteria
  const {
    start_date,
    end_date,
    author_type,
    author_id,
    page,
    limit,
    sort_order,
  } = props.body;
  const where: Record<string, unknown> = {
    article_id: props.articleId,
    ...(start_date && { created_at: { gte: start_date } }),
    ...(end_date && {
      created_at: {
        ...(start_date && { gte: start_date }),
        lte: end_date,
      },
    }),
    ...(author_type === "user" && { author_user_id: { not: null } }),
    ...(author_type === "admin" && { author_admin_id: { not: null } }),
    ...(author_id &&
      (author_type === "user"
        ? { author_user_id: author_id }
        : author_type === "admin"
          ? { author_admin_id: author_id }
          : {
              OR: [
                { author_user_id: author_id },
                { author_admin_id: author_id },
              ],
            })),
  };

  // Sort order (default: desc)
  const orderBy = {
    created_at:
      sort_order === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc,
  };

  // Pagination
  const currentPage = page;
  const pageLimit = limit;
  const skip = (currentPage - 1) * pageLimit;

  // 3. Query data and total count concurrently
  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where,
      skip,
      take: pageLimit,
      orderBy,
      include: {
        authorUser: true,
        authorAdmin: true,
      },
    }),
    MyGlobal.prisma.discussion_board_article_snapshots.count({ where }),
  ]);

  // 4. Map snapshots to DTO with strict type matching
  const data = snapshots.map((s) => ({
    id: s.id,
    article_id: s.article_id,
    author_user_id: s.author_user_id === null ? undefined : s.author_user_id,
    author_admin_id: s.author_admin_id === null ? undefined : s.author_admin_id,
    author_user: s.authorUser
      ? {
          id: s.authorUser.id,
          email: s.authorUser.email,
          is_email_verified: s.authorUser.is_email_verified,
          is_active: s.authorUser.is_active,
          is_blocked: s.authorUser.is_blocked,
          created_at: toISOStringSafe(s.authorUser.created_at),
          updated_at: toISOStringSafe(s.authorUser.updated_at),
          deleted_at:
            s.authorUser.deleted_at === null
              ? undefined
              : toISOStringSafe(s.authorUser.deleted_at),
        }
      : undefined,
    author_admin: s.authorAdmin
      ? {
          id: s.authorAdmin.id,
          display_name: s.authorAdmin.email,
        }
      : undefined,
    title: s.title,
    body: s.body,
    created_at: toISOStringSafe(s.created_at),
  }));

  // 5. Pagination metadata
  const pagination = {
    current: currentPage,
    limit: pageLimit,
    records: total,
    pages: Math.ceil(total / pageLimit),
  };

  return { data, pagination };
}
