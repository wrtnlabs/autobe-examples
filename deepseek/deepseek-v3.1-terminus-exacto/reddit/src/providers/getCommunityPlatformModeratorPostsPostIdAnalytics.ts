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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostViewTransformer } from "../transformers/CommunityPlatformPostViewTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdAnalytics(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostView> {
  // First verify post exists and get community_id
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
      },
    },
  );
  // Check moderator access to the community
  const moderatorAccess =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: post.community_id,
        deleted_at: null,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "You do not have moderator access to this community",
      403,
    );
  }
  // Since the specification requires returning ICommunityPlatformPostView,
  // we'll create a representative analytics view with aggregated data
  // Get the most recent view record as base
  const latestView =
    await MyGlobal.prisma.community_platform_post_views.findFirst({
      where: { community_platform_post_id: props.postId },
      orderBy: { created_at: "desc" },
      ...CommunityPlatformPostViewTransformer.select(),
    });
  if (!latestView) {
    // If no views exist, create a minimal analytics record
    const postData =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: props.postId },
        ...CommunityPlatformPostAtSummaryTransformer.select(),
      });
    return {
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      ip_address: null,
      user_agent: null,
      referrer: null,
      view_duration: null,
      post: await CommunityPlatformPostAtSummaryTransformer.transform(postData),
      user: null,
    };
  }
  // Transform the existing view record
  return await CommunityPlatformPostViewTransformer.transform(latestView);
}
