import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const authorizedAsOwner =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        community_owner_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const authorizedAsModerator = authorizedAsOwner
    ? null
    : await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          moderator_user_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
  if (authorizedAsOwner === null && authorizedAsModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const bans = await MyGlobal.prisma.community_platform_community_bans.findMany(
    {
      where: {
        community_id: props.communityId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: [{ banned_at: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        community_id: true,
        banned_user_id: true,
        applied_by_moderator_id: true,
        banned_at: true,
        unbanned_at: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.community_platform_community_bans.count({
    where: {
      community_id: props.communityId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: bans.map((ban) => ({
      id: ban.id,
      communityId: ban.community_id,
      bannedUserId: ban.banned_user_id,
      appliedByModeratorId: ban.applied_by_moderator_id,
      bannedAt: toISOStringSafe(ban.banned_at),
      unbannedAt:
        ban.unbanned_at === null ? null : toISOStringSafe(ban.unbanned_at),
      banReason: ban.ban_reason,
      createdAt: toISOStringSafe(ban.created_at),
      updatedAt: toISOStringSafe(ban.updated_at),
      deletedAt: null,
    })),
  };
}
