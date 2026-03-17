import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostViewStatTransformer } from "../transformers/CommunityPlatformPostViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdViewStats(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostViewStat.IRequest;
}): Promise<IPageICommunityPlatformPostViewStat.ISummary> {
  // Verify post exists and get post summary using the transformer
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...CommunityPlatformPostAtSummaryTransformer.select(),
    },
  );
  // Transform post to ICommunityPlatformPost.ISummary
  const postSummary =
    await CommunityPlatformPostAtSummaryTransformer.transform(post);
  // Build where clause for filters
  const where: Prisma.community_platform_post_view_statsWhereInput = {
    community_platform_post_id: props.postId,
    ...(props.body.actor_type !== undefined && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.start_date !== undefined && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date !== undefined && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.community_platform_post_view_stats.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostViewStatTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.community_platform_post_view_stats.count({
    where,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostViewStatTransformer.transform,
  );
  // Convert ICommunityPlatformPostViewStat to ISummary format
  const summaryData = transformedData.map((stat) => ({
    id: stat.id,
    post: postSummary,
    actorType: stat.actor_type,
    viewCount: stat.view_count,
    uniqueViewerCount: stat.unique_viewer_count,
    createdAt: toISOStringSafe(stat.created_at),
  }));
  // Return paginated response
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: summaryData,
  };
}
