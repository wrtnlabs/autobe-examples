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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostViewStatTransformer } from "../transformers/CommunityPlatformPostViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getCommunityPlatformAdminPostsPostIdViewStatsViewStatId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  viewStatId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostViewStat> {
  // Admin can view any post's view statistics system-wide
  // Find view statistic with both ID and post ID validation
  const viewStat =
    await MyGlobal.prisma.community_platform_post_view_stats.findUniqueOrThrow({
      where: {
        id: props.viewStatId,
        community_platform_post_id: props.postId,
      },
      ...CommunityPlatformPostViewStatTransformer.select(),
    });
  // Transform to response DTO
  return await CommunityPlatformPostViewStatTransformer.transform(viewStat);
}
