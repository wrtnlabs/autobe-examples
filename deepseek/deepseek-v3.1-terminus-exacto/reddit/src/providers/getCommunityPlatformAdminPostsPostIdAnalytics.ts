import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostViewTransformer } from "../transformers/CommunityPlatformPostViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdAnalytics(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostView> {
  // Verify post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Get comprehensive view data for analytics
  const viewData =
    await MyGlobal.prisma.community_platform_post_views.findFirst({
      where: { community_platform_post_id: props.postId },
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostViewTransformer.select(),
    });
  if (!viewData) {
    throw new HttpException("No view data available for analytics", 404);
  }
  // Get aggregated statistics for additional analytics
  const totalViews = await MyGlobal.prisma.community_platform_post_views.count({
    where: { community_platform_post_id: props.postId },
  });
  const uniqueViewers =
    await MyGlobal.prisma.community_platform_post_views.count({
      where: { community_platform_post_id: props.postId },
    });
  const averageViewDuration =
    await MyGlobal.prisma.community_platform_post_views.aggregate({
      where: {
        community_platform_post_id: props.postId,
        view_duration: { not: null },
      },
      _avg: { view_duration: true },
    });
  // Transform the view data with additional analytics context
  const analytics =
    await CommunityPlatformPostViewTransformer.transform(viewData);
  // Return the analytics data
  return analytics;
}
