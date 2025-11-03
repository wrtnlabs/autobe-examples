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

export async function putCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IUpdate;
}): Promise<ICommunityPlatformCommunityBan> {
  // Step 1: Find the ban record ensuring it belongs to the correct community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        community_platform_community_id: props.communityId,
      },
    },
  );
  if (!ban) {
    throw new HttpException("Ban not found in this community", 404);
  }

  // Step 2: Update allowed fields only
  const updated =
    await MyGlobal.prisma.community_platform_community_bans.update({
      where: { id: props.banId },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.expires_at !== undefined && {
          expires_at:
            props.body.expires_at === null ? null : props.body.expires_at,
        }),
        ...(props.body.revoked_at !== undefined && {
          revoked_at:
            props.body.revoked_at === null ? null : props.body.revoked_at,
        }),
      },
    });

  // Step 3: Fetch related community and users for summaries
  const [community, bannedUser, bannedByUser] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: updated.community_platform_community_id },
    }),
    MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: updated.community_platform_user_id },
    }),
    MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: updated.banned_by_user_id },
    }),
  ]);
  if (!community || !bannedUser || !bannedByUser) {
    throw new HttpException("Related entities not found", 500);
  }

  // Step 4: Build response DTO (convert all date fields accordingly)
  return {
    id: updated.id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    user: {
      id: bannedUser.id,
      display_name: bannedUser.display_name,
    },
    bannedBy: {
      id: bannedByUser.id,
      display_name: bannedByUser.display_name,
    },
    reason: updated.reason,
    banned_at: toISOStringSafe(updated.banned_at),
    expires_at:
      updated.expires_at === null ? null : toISOStringSafe(updated.expires_at),
    revoked_at:
      updated.revoked_at === null ? null : toISOStringSafe(updated.revoked_at),
  };
}
