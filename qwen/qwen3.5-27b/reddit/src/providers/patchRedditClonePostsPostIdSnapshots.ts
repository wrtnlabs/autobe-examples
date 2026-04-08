import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostSnapshotAtSummaryTransformer } from "../transformers/RedditClonePostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostSnapshot.IRequest;
}): Promise<IPageIRedditClonePostSnapshot.ISummary> {
  // Verify the post exists (returns 404 if not found)
  await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.pageSize ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for post_id and optional date range
  const whereInput = {
    reddit_clone_post_id: props.postId,
    ...(props.body.startDate && {
      snapshot_created_at: {
        gte: new Date(props.body.startDate),
      },
    }),
    ...(props.body.endDate && {
      snapshot_created_at: {
        lte: new Date(props.body.endDate),
      },
    }),
  } satisfies Prisma.reddit_clone_post_snapshotsWhereInput;
  // Build orderBy clause for sorting
  const sortBy = props.body.sortBy ?? "snapshot_created_at";
  const sortOrder = (props.body.sortOrder ?? "desc").toLowerCase() as
    | "asc"
    | "desc";
  const orderByInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.reddit_clone_post_snapshotsOrderByWithRelationInput;
  // Execute findMany query with pagination, sorting, and filtering
  const records = await MyGlobal.prisma.reddit_clone_post_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditClonePostSnapshotAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_clone_post_snapshots.count({
    where: whereInput,
  });
  // Transform records using transformer
  const data = await ArrayUtil.asyncMap(
    records,
    RedditClonePostSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
