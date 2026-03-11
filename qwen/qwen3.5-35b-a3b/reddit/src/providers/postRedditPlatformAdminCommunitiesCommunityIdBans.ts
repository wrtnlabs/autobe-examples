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
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.ICreate;
}): Promise<IRedditPlatformCommunityBan> {
  // Validate target user exists
  const targetUser = await MyGlobal.prisma.reddit_platform_members.findUnique({
    where: { id: props.body.userId },
  });
  if (targetUser === null) {
    throw new HttpException("User not found", 404);
  }
  // Prevent self-banning
  if (props.body.userId === props.admin.id) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // Check for existing ban
  const existingBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.body.userId,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Create ban record with required relations for transformer
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.create({
    data: {
      id: v4(),
      community_id: props.communityId,
      user_id: props.body.userId,
      banned_by: props.admin.id,
      expires_at: props.body.expiresAt ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      expires_at: true,
      community: RedditPlatformCommunityAtSummaryTransformer.select(),
      bannedUser: RedditPlatformMemberAtSummaryTransformer.select(),
    },
  });
  // Transform and return response
  return await RedditPlatformCommunityBanTransformer.transform(ban);
}
