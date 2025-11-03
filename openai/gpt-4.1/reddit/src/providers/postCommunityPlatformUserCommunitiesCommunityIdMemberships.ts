import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserCommunitiesCommunityIdMemberships(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.ICreate;
}): Promise<ICommunityPlatformCommunityMembership> {
  // 1. Check that the target community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, name: true, description: true },
    });
  if (!community) {
    throw new HttpException("Community not found or has been deleted", 404);
  }

  // 2. Check for existing active membership (user in this community)
  const existingMembership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        community_platform_community_id: props.communityId,
      },
    });
  if (existingMembership) {
    throw new HttpException("You are already a member of this community", 400);
  }

  // 3. Check for active ban (not revoked/expired) on user in this community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        community_platform_user_id: props.user.id,
        community_platform_community_id: props.communityId,
        revoked_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: toISOStringSafe(new Date()) } },
        ],
      },
    },
  );
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }

  // 4. Create the membership
  const membershipId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.create({
      data: {
        id: membershipId,
        community_platform_user_id: props.user.id,
        community_platform_community_id: props.communityId,
        joined_at: now,
      },
    });

  // 5. Fetch user and community info for response (expand as ISummary)
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: props.user.id, deleted_at: null },
    select: { id: true, display_name: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // use already fetched community ISummary fields
  return {
    id: membership.id,
    user: {
      id: user.id,
      display_name: user.display_name,
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    joined_at: toISOStringSafe(membership.joined_at),
  };
}
