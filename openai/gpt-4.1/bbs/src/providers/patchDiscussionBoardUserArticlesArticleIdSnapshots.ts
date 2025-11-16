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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchDiscussionBoardUserArticlesArticleIdSnapshots(props: {
  user: UserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot> {
  // (1) Check that the target article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  // (2) Authorize user (must be active, not blocked, not deleted, already enforced by decorator)
  // (3) Build where filter
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
    ...(author_type === "user" ? { author_user_id: { not: null } } : {}),
    ...(author_type === "admin" ? { author_admin_id: { not: null } } : {}),
    ...(author_id
      ? author_type === "user"
        ? { author_user_id: author_id }
        : author_type === "admin"
          ? { author_admin_id: author_id }
          : {
              OR: [
                { author_user_id: author_id },
                { author_admin_id: author_id },
              ],
            }
      : {}),
    ...(start_date || end_date
      ? {
          created_at: {
            ...(start_date ? { gte: start_date } : {}),
            ...(end_date ? { lte: end_date } : {}),
          },
        }
      : {}),
  };
  const skip = (page - 1) * limit;
  // orderBy: Map to 'asc' | 'desc' to Prisma.SortOrder type
  const orderBy = {
    created_at: (sort_order === "asc" ? "asc" : "desc") as Prisma.SortOrder,
  };
  // (4) Query snapshots + total count
  const [snapshots, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_article_snapshots.count({ where }),
  ]);
  // (5) Load author summaries and build result
  // userIds/adminIds filter to (string[]), removing null values
  const userIds = snapshots
    .map((s) => s.author_user_id)
    .filter((x): x is string => typeof x === "string");
  const adminIds = snapshots
    .map((s) => s.author_admin_id)
    .filter((x): x is string => typeof x === "string");
  const [users, admins] = await Promise.all([
    userIds.length
      ? MyGlobal.prisma.discussion_board_users.findMany({
          where: { id: { in: userIds } },
        })
      : Promise.resolve([]),
    adminIds.length
      ? MyGlobal.prisma.discussion_board_admins.findMany({
          where: { id: { in: adminIds } },
        })
      : Promise.resolve([]),
  ]);
  function buildUserSummary(u: any) {
    return {
      id: u.id,
      email: u.email,
      is_email_verified: u.is_email_verified,
      is_active: u.is_active,
      is_blocked: u.is_blocked,
      created_at: toISOStringSafe(u.created_at),
      updated_at: toISOStringSafe(u.updated_at),
      deleted_at:
        u.deleted_at === null ? undefined : toISOStringSafe(u.deleted_at),
    };
  }
  function buildAdminSummary(a: any) {
    return {
      id: a.id,
      display_name: a.email,
    };
  }
  return {
    data: snapshots.map((snap) => {
      const user = users.find((u) => u.id === snap.author_user_id);
      const admin = admins.find((a) => a.id === snap.author_admin_id);
      return {
        id: snap.id,
        article_id: snap.article_id,
        author_user_id:
          snap.author_user_id === null ? undefined : snap.author_user_id,
        author_admin_id:
          snap.author_admin_id === null ? undefined : snap.author_admin_id,
        author_user: user ? buildUserSummary(user) : undefined,
        author_admin: admin ? buildAdminSummary(admin) : undefined,
        title: snap.title,
        body: snap.body,
        created_at: toISOStringSafe(snap.created_at),
      };
    }),
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
