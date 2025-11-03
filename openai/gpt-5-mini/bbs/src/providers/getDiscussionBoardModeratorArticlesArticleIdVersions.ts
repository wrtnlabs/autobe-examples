import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorArticlesArticleIdVersions(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  page: number & tags.Type<"int32">;
  limit: number & tags.Type<"int32">;
  sort: string;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  const { moderator, articleId, page: rawPage, limit: rawLimit, sort } = props;

  // Authorization: ensure moderator exists and is active
  const moderatorExists =
    await MyGlobal.prisma.discussion_board_moderator.findFirst({
      where: { id: moderator.id, deleted_at: null },
    });
  if (!moderatorExists) throw new HttpException("Forbidden", 403);

  // Pagination normalization and validation (business logic)
  const page = Number(rawPage) || 1;
  const limit = Number(rawLimit) || 20;
  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );

  const skip = (page - 1) * limit;

  // Determine order inline (only snapshot_at supported)
  const orderByClause: Prisma.discussion_board_article_snapshotsOrderByWithRelationInput =
    sort &&
    typeof sort === "string" &&
    sort.replace(/^[-+]/, "") === "snapshot_at"
      ? sort.startsWith("-")
        ? { snapshot_at: "desc" as Prisma.SortOrder }
        : { snapshot_at: "asc" as Prisma.SortOrder }
      : { snapshot_at: "desc" as Prisma.SortOrder };

  // Count total snapshots for pagination
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: { discussion_board_article_id: articleId },
  });

  // Fetch snapshots page
  const rows =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: { discussion_board_article_id: articleId },
      orderBy: orderByClause,
      skip,
      take: limit,
    });

  // Map Prisma results to DTOs with careful null/undefined handling
  const data: IDiscussionBoardArticleSnapshot.ISummary[] = rows.map((r) => {
    // Build minimal article summary from denormalized snapshot fields
    const article: IDiscussionBoardArticle.ISummary = {
      id: r.discussion_board_article_id,
      title: r.title,
      excerpt: r.content ? r.content.slice(0, 200) : undefined,
      author: undefined,
      isPinned: undefined,
      publishedAt: undefined,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
      category: undefined,
    };

    const snapshot: IDiscussionBoardArticleSnapshot.ISummary = {
      id: r.id,
      article,
      title: r.title,
      snapshot_at: toISOStringSafe(r.snapshot_at),
      created_at: toISOStringSafe(r.created_at),
      state: typia.assert<"draft" | "published" | "pending_review" | "hidden">(
        r.state,
      ),
      content_excerpt: r.content ? r.content.slice(0, 200) : undefined,
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    };

    return snapshot;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
