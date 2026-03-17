import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdStatistics(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostViewStat.IRequest;
}): Promise<ICommunityPlatformPostViewStat> {
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Build WHERE clause for view statistics
  const viewStatsWhere: Prisma.community_platform_post_view_statsWhereInput = {
    community_platform_post_id: props.postId,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
  };
  // Aggregate view statistics
  const viewStatsAgg =
    await MyGlobal.prisma.community_platform_post_view_stats.aggregate({
      where: viewStatsWhere,
      _sum: {
        view_count: true,
        unique_viewer_count: true,
      },
      _count: true,
    });
  // Fetch post details with transformer
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    },
  );
  // Transform the post
  const transformedPost =
    await CommunityPlatformPostAtSummaryTransformer.transform(post);
  // Build response
  const now = new Date();
  return {
    id: v4(),
    actor_type: typia.assert<"guest" | "member">(
      props.body.actor_type ?? "guest",
    ),
    view_count: (viewStatsAgg._sum.view_count ?? 0) satisfies number as number,
    unique_viewer_count: (viewStatsAgg._sum.unique_viewer_count ??
      0) satisfies number as number,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
    post: transformedPost,
  };
}
