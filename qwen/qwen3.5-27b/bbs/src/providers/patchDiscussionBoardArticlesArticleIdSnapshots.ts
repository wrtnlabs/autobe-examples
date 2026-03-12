import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardArticleSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Validate article exists and is not deleted
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.discussion_board_article_snapshotsWhereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.authorId && {
      discussion_board_member_id: props.body.authorId,
    }),
    ...(props.body.from && {
      created_at: {
        gte: new Date(props.body.from),
      },
    }),
    ...(props.body.to && {
      created_at: {
        lte: new Date(props.body.to),
      },
    }),
  } satisfies Prisma.discussion_board_article_snapshotsWhereInput;
  // Sort order with validation
  const sortField = props.body.sort ?? "created_at desc";
  const [sortKey, sortDir] = sortField.split(" ");
  const orderByInput: Prisma.discussion_board_article_snapshotsOrderByWithRelationInput =
    (
      sortKey === "title"
        ? { title: sortDir === "asc" ? "asc" : "desc" }
        : { created_at: sortDir === "asc" ? "asc" : "desc" }
    ) satisfies Prisma.discussion_board_article_snapshotsOrderByWithRelationInput;
  // Query snapshots
  const data =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardArticleSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardArticleSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
