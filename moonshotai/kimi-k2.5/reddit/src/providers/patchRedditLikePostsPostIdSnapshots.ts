import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostSnapshotAtSummaryTransformer } from "../transformers/RedditLikePostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikePostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditLikePostSnapshot.IRequest;
}): Promise<IPageIRedditLikePostSnapshot.ISummary> {
  // Verify post exists first
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const order = props.body.order ?? "desc";
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const snapshots = await MyGlobal.prisma.reddit_like_post_snapshots.findMany({
    where: { reddit_like_post_id: props.postId },
    skip,
    take: limit,
    orderBy: { created_at: order },
    ...RedditLikePostSnapshotAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.reddit_like_post_snapshots.count({
    where: { reddit_like_post_id: props.postId },
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      RedditLikePostSnapshotAtSummaryTransformer.transform,
    ),
  };
}
