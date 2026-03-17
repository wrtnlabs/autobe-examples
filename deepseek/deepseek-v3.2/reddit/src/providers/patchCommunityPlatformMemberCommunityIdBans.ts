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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  // 1. Verify community exists and member has moderation role
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderationRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Build WHERE clause
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.active !== undefined && { active: props.body.active }),
    ...(props.body.bannedAtFrom !== undefined && {
      banned_at: { gte: new Date(props.body.bannedAtFrom) },
    }),
    ...(props.body.bannedAtTo !== undefined && {
      banned_at: { lte: new Date(props.body.bannedAtTo) },
    }),
    ...(props.body.expiresAtFrom !== undefined &&
      props.body.expiresAtFrom !== null && {
        expires_at: { gte: new Date(props.body.expiresAtFrom) },
      }),
    ...(props.body.expiresAtTo !== undefined &&
      props.body.expiresAtTo !== null && {
        expires_at: { lte: new Date(props.body.expiresAtTo) },
      }),
    ...(props.body.unbannedAtFrom !== undefined &&
      props.body.unbannedAtFrom !== null && {
        unbanned_at: { gte: new Date(props.body.unbannedAtFrom) },
      }),
    ...(props.body.unbannedAtTo !== undefined &&
      props.body.unbannedAtTo !== null && {
        unbanned_at: { lte: new Date(props.body.unbannedAtTo) },
      }),
  } satisfies Prisma.community_platform_bansWhereInput;
  // 3. Apply username filter with join
  let filteredWhere: Prisma.community_platform_bansWhereInput = whereInput;
  if (props.body.username !== undefined) {
    // This requires a subquery approach
    const members = await MyGlobal.prisma.community_platform_members.findMany({
      where: {
        username: { contains: props.body.username, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (members.length === 0) {
      // If no members match the username, return empty result
      return {
        data: [],
        pagination: {
          current: props.body.page ?? 1,
          limit: props.body.limit ?? 100,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IPageICommunityPlatformBan.ISummary;
    }
    filteredWhere = {
      ...filteredWhere,
      bannedMember: {
        id: { in: members.map((m) => m.id) },
      },
    };
  }
  // 4. Handle pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 5. Build ORDER BY
  const orderByInput = (
    props.body.sort === "expires_at"
      ? { expires_at: props.body.direction ?? "desc" }
      : props.body.sort === "username"
        ? {
            bannedMember: { username: props.body.direction ?? "asc" },
          }
        : { banned_at: props.body.direction ?? "desc" }
  ) satisfies Prisma.community_platform_bansOrderByWithRelationInput;
  // 6. Execute query with joins
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_bans.findMany({
      where: filteredWhere,
      skip,
      take: limit,
      orderBy: orderByInput,
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
        },
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
            },
          },
        },
      },
    }),
    MyGlobal.prisma.community_platform_bans.count({ where: filteredWhere }),
  ]);
  // 7. Transform results
  const transformedData = await ArrayUtil.asyncMap(data, async (ban) => {
    return {
      id: ban.id as string & tags.Format<"uuid">,
      reason: ban.reason,
      banned_at: toISOStringSafe(ban.banned_at),
      expires_at:
        ban.expires_at !== null ? toISOStringSafe(ban.expires_at) : null,
      unbanned_at:
        ban.unbanned_at !== null ? toISOStringSafe(ban.unbanned_at) : null,
      active: ban.active,
      banned_member: {
        id: ban.bannedMember.id,
        email: ban.bannedMember.email as string & tags.Format<"email">,
        username: ban.bannedMember.username,
        nickname: ban.bannedMember.nickname ?? undefined,
        email_verified: ban.bannedMember.email_verified,
        registered_at: toISOStringSafe(ban.bannedMember.registered_at),
        last_login_at:
          ban.bannedMember.last_login_at !== null
            ? toISOStringSafe(ban.bannedMember.last_login_at)
            : undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      moderator: {
        id: ban.issuingModeratorRole.member.id,
        email: ban.issuingModeratorRole.member.email as string &
          tags.Format<"email">,
        username: ban.issuingModeratorRole.member.username,
        nickname: ban.issuingModeratorRole.member.nickname ?? undefined,
        email_verified: ban.issuingModeratorRole.member.email_verified,
        registered_at: toISOStringSafe(
          ban.issuingModeratorRole.member.registered_at,
        ),
        last_login_at:
          ban.issuingModeratorRole.member.last_login_at !== null
            ? toISOStringSafe(ban.issuingModeratorRole.member.last_login_at)
            : undefined,
      } satisfies ICommunityPlatformMember.ISummary,
    } satisfies ICommunityPlatformBan.ISummary;
  });
  // 8. Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformBan.ISummary;
}
