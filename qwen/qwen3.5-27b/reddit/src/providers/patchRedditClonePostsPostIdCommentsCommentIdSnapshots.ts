import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommentSnapshotAtSummaryTransformer } from "../transformers/RedditCloneCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdCommentsCommentIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneCommentSnapshot.IRequest;
}): Promise<IPageIRedditCloneCommentSnapshot.ISummary> {
  // Validate that the comment exists and belongs to the post
  await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow({
    where: {
      id: props.commentId,
      reddit_clone_post_id: props.postId,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.reddit_clone_comment_snapshotsWhereInput = {
    reddit_clone_comment_id: props.commentId,
  };
  // Date range filter
  if (props.body.from_date !== undefined) {
    whereInput.snapshot_created_at = {
      gte: new Date(props.body.from_date),
    };
  }
  if (props.body.to_date !== undefined) {
    if (
      whereInput.snapshot_created_at &&
      typeof whereInput.snapshot_created_at === "object" &&
      "gte" in whereInput.snapshot_created_at
    ) {
      (whereInput.snapshot_created_at as any).lte = new Date(
        props.body.to_date,
      );
    } else {
      whereInput.snapshot_created_at = {
        lte: new Date(props.body.to_date),
      };
    }
  }
  // Vote score range filter
  if (props.body.vote_score_min !== undefined) {
    whereInput.vote_score = {
      gte: props.body.vote_score_min,
    };
  }
  if (props.body.vote_score_max !== undefined) {
    if (
      whereInput.vote_score &&
      typeof whereInput.vote_score === "object" &&
      "gte" in whereInput.vote_score
    ) {
      (whereInput.vote_score as any).lte = props.body.vote_score_max;
    } else {
      whereInput.vote_score = {
        lte: props.body.vote_score_max,
      };
    }
  }
  // Deleted state filter
  if (props.body.is_deleted !== undefined && props.body.is_deleted !== null) {
    whereInput.comment_deleted_at = props.body.is_deleted
      ? { not: null }
      : { equals: null };
  }
  // Content search filter (trigram matching)
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.content = {
      contains: props.body.search,
    };
  }
  // Build order by clause
  const orderByInput: Prisma.reddit_clone_comment_snapshotsOrderByWithRelationInput =
    {
      snapshot_created_at: "desc",
    };
  if (props.body.sort !== undefined) {
    const sortOrder: "asc" | "desc" = props.body.order ?? "desc";
    if (props.body.sort === "snapshot_created_at") {
      orderByInput.snapshot_created_at = sortOrder;
    } else if (props.body.sort === "vote_score") {
      orderByInput.vote_score = sortOrder;
    } else if (props.body.sort === "content") {
      orderByInput.content = sortOrder;
    }
  }
  // Fetch snapshots with pagination
  const data = await MyGlobal.prisma.reddit_clone_comment_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneCommentSnapshotAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_comment_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
