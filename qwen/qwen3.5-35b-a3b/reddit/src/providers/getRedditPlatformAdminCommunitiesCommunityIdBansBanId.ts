import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityBan> {
  // Step 1: Verify admin has moderation privileges in the specified community
  const moderator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
      select: { id: true },
    });
  let hasPrivileges = moderator !== null;
  if (!hasPrivileges) {
    // Step 2: Check if admin is the owner of the community
    const community =
      await MyGlobal.prisma.reddit_platform_communities.findUnique({
        where: { id: props.communityId },
        select: { owner_id: true },
      });
    if (community !== null && community.owner_id === props.admin.id) {
      hasPrivileges = true;
    }
  }
  if (!hasPrivileges) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Query the ban record with community_id verification and transformer select
  const banRecord =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
        community_id: props.communityId,
      },
      ...RedditPlatformCommunityBanTransformer.select(),
    });
  // Step 4: Verify ban is active (deleted_at is null)
  if (banRecord.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 5: Transform and return the ban record
  return await RedditPlatformCommunityBanTransformer.transform(banRecord);
}
