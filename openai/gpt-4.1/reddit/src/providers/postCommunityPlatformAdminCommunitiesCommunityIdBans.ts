import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Check if community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: props.communityId, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check if user exists and is not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: props.body.community_platform_user_id, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check for pre-existing active ban (not revoked)
  const duplicate =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_user_id: props.body.community_platform_user_id,
        community_platform_community_id: props.communityId,
        revoked_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException("User is already banned in this community", 409);
  }

  // Confirm admin exists and active (should always succeed per authentication)
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const ban = await MyGlobal.prisma.community_platform_community_bans.create({
    data: {
      id: v4(),
      community_platform_user_id: props.body.community_platform_user_id,
      community_platform_community_id: props.communityId,
      banned_by_user_id: props.admin.id,
      reason: props.body.reason,
      banned_at: now,
      expires_at: props.body.expires_at ?? null,
      revoked_at: null,
    },
  });

  return {
    id: ban.id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    user: {
      id: user.id,
      display_name: user.display_name,
    },
    bannedBy: {
      id: admin.id,
      display_name: admin.display_name,
    },
    reason: ban.reason,
    banned_at: toISOStringSafe(ban.banned_at),
    expires_at:
      ban.expires_at === null ? null : toISOStringSafe(ban.expires_at),
    revoked_at:
      ban.revoked_at === null ? null : toISOStringSafe(ban.revoked_at),
  };
}
