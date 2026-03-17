import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  // Verify admin has moderation role in this community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.admin.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderationRole) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.community_platform_bansWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (props.body.active !== undefined) {
    whereConditions.active = props.body.active;
  }
  // Handle date filters without Date objects
  if (
    props.body.bannedAtFrom !== undefined ||
    props.body.bannedAtTo !== undefined
  ) {
    whereConditions.banned_at = {};
    if (props.body.bannedAtFrom !== undefined) {
      whereConditions.banned_at.gte = new Date(props.body.bannedAtFrom);
    }
    if (props.body.bannedAtTo !== undefined) {
      whereConditions.banned_at.lte = new Date(props.body.bannedAtTo);
    }
  }
  if (
    props.body.expiresAtFrom !== undefined ||
    props.body.expiresAtTo !== undefined
  ) {
    whereConditions.expires_at = {};
    if (
      props.body.expiresAtFrom !== undefined &&
      props.body.expiresAtFrom !== null
    ) {
      whereConditions.expires_at.gte = new Date(props.body.expiresAtFrom);
    }
    if (
      props.body.expiresAtTo !== undefined &&
      props.body.expiresAtTo !== null
    ) {
      whereConditions.expires_at.lte = new Date(props.body.expiresAtTo);
    }
  }
  if (
    props.body.unbannedAtFrom !== undefined ||
    props.body.unbannedAtTo !== undefined
  ) {
    whereConditions.unbanned_at = {};
    if (
      props.body.unbannedAtFrom !== undefined &&
      props.body.unbannedAtFrom !== null
    ) {
      whereConditions.unbanned_at.gte = new Date(props.body.unbannedAtFrom);
    }
    if (
      props.body.unbannedAtTo !== undefined &&
      props.body.unbannedAtTo !== null
    ) {
      whereConditions.unbanned_at.lte = new Date(props.body.unbannedAtTo);
    }
  }
  // Handle username search filter
  if (props.body.username !== undefined) {
    whereConditions.bannedMember = {
      username: {
        contains: props.body.username,
        mode: "insensitive" as const,
      },
    };
  }
  // Build orderBy
  const orderByInput: Prisma.community_platform_bansOrderByWithRelationInput = {
    banned_at: "desc",
  };
  if (props.body.sort === "banned_at") {
    orderByInput.banned_at = props.body.direction === "asc" ? "asc" : "desc";
  } else if (props.body.sort === "expires_at") {
    orderByInput.expires_at = props.body.direction === "asc" ? "asc" : "desc";
  } else if (props.body.sort === "username") {
    orderByInput.bannedMember = {
      username: props.body.direction === "asc" ? "asc" : "desc",
    };
  }
  // Execute query with pagination
  const [bans, total] = await Promise.all([
    MyGlobal.prisma.community_platform_bans.findMany({
      where: whereConditions,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        reason: true,
        banned_at: true,
        expires_at: true,
        unbanned_at: true,
        active: true,
        bannedMember: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
        issuingModeratorRole: {
          select: {
            member: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                email_verified: true,
                registered_at: true,
                last_login_at: true,
              },
            } satisfies Prisma.community_platform_membersFindManyArgs,
          },
        } satisfies Prisma.community_platform_moderation_rolesFindManyArgs,
      },
    }),
    MyGlobal.prisma.community_platform_bans.count({
      where: whereConditions,
    }),
  ]);
  // Transform results using CommunityPlatformBanAtSummaryTransformer
  const transformedBans = await ArrayUtil.asyncMap(bans, async (ban) => {
    const bannedMember = {
      id: ban.bannedMember.id,
      email: ban.bannedMember.email,
      username: ban.bannedMember.username,
      nickname: ban.bannedMember.nickname ?? undefined,
      email_verified: ban.bannedMember.email_verified,
      registered_at: toISOStringSafe(ban.bannedMember.registered_at),
      last_login_at: ban.bannedMember.last_login_at
        ? toISOStringSafe(ban.bannedMember.last_login_at)
        : undefined,
    } satisfies ICommunityPlatformMember.ISummary;
    const moderator = {
      id: ban.issuingModeratorRole.member.id,
      email: ban.issuingModeratorRole.member.email,
      username: ban.issuingModeratorRole.member.username,
      nickname: ban.issuingModeratorRole.member.nickname ?? undefined,
      email_verified: ban.issuingModeratorRole.member.email_verified,
      registered_at: toISOStringSafe(
        ban.issuingModeratorRole.member.registered_at,
      ),
      last_login_at: ban.issuingModeratorRole.member.last_login_at
        ? toISOStringSafe(ban.issuingModeratorRole.member.last_login_at)
        : undefined,
    } satisfies ICommunityPlatformMember.ISummary;
    return {
      id: ban.id,
      reason: ban.reason,
      banned_at: toISOStringSafe(ban.banned_at),
      expires_at: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
      unbanned_at: ban.unbanned_at ? toISOStringSafe(ban.unbanned_at) : null,
      active: ban.active,
      banned_member: bannedMember,
      moderator: moderator,
    } satisfies ICommunityPlatformBan.ISummary;
  });
  return {
    data: transformedBans,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
