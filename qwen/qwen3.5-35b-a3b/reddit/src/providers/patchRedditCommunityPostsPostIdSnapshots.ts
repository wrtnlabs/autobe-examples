import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  // 1. Verify post exists
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // 2. Build where clause with filters
  const whereInput: Prisma.reddit_community_post_snapshotsWhereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
    ...(props.body.edited_by_member_id && {
      edited_by_member_id: props.body.edited_by_member_id,
    }),
    ...(props.body.post_type && {
      post_type: props.body.post_type,
    }),
  } satisfies Prisma.reddit_community_post_snapshotsWhereInput;
  // 3. Build orderBy clause
  const orderByInput: Prisma.reddit_community_post_snapshotsOrderByWithRelationInput[] =
    [
      props.body.sort === "vote_score"
        ? { vote_score: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "comment_count"
          ? { comment_count: props.body.order === "asc" ? "asc" : "desc" }
          : { created_at: props.body.order === "asc" ? "asc" : "desc" },
    ];
  // 4. Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Query snapshots with transformer select
  const data = await MyGlobal.prisma.reddit_community_post_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
  });
  // 6. Check if no snapshots found
  if (data.length === 0) {
    throw new HttpException("Not Found", 404);
  }
  // 7. Count total records
  const total = await MyGlobal.prisma.reddit_community_post_snapshots.count({
    where: whereInput,
  });
  // 8. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityPostSnapshotAtSummaryTransformer.transform,
  );
  // 9. Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
