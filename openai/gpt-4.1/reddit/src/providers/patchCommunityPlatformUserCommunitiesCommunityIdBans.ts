import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityPlatformUserCommunitiesCommunityIdBans(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // Permission: Only moderators or creator can access
  const [isCreator, isModerator] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        creator_user_id: props.user.id,
        deleted_at: null,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_user_id: props.user.id,
      },
      select: { id: true },
    }),
  ]);
  if (!isCreator && !isModerator) {
    throw new HttpException(
      "Forbidden: Only community moderators or the creator can access ban list",
      403,
    );
  }
  const body = props.body ?? {};
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;
  const offset = (page - 1) * limit;
  const sortField =
    body.sort_by === "banned_at" ||
    body.sort_by === "expires_at" ||
    body.sort_by === "revoked_at"
      ? body.sort_by
      : "banned_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";
  const nowIso = toISOStringSafe(new Date());
  const where: Record<string, any> = {
    community_platform_community_id: props.communityId,
    ...(body.reason !== undefined &&
      body.reason !== null && {
        reason: { contains: body.reason },
      }),
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && {
        banned_by_user_id: body.moderator_id,
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        community_platform_user_id: body.user_id,
      }),
    ...(body.banned_after !== undefined &&
      body.banned_after !== null && {
        banned_at: { gte: body.banned_after },
      }),
    ...(body.banned_before !== undefined &&
      body.banned_before !== null && {
        banned_at: { lte: body.banned_before },
      }),
    ...(body.expires_after !== undefined &&
      body.expires_after !== null && {
        expires_at: { gte: body.expires_after },
      }),
    ...(body.expires_before !== undefined &&
      body.expires_before !== null && {
        expires_at: { lte: body.expires_before },
      }),
  };
  const [bans, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_bans.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: offset,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_bans.count({ where }),
  ]);
  const filterStatus = body.status;
  const filteredBans =
    filterStatus !== undefined
      ? bans.filter((ban) => {
          const now = nowIso;
          if (filterStatus === "revoked") return ban.revoked_at !== null;
          if (
            filterStatus === "expired" &&
            ban.revoked_at === null &&
            ban.expires_at !== null &&
            toISOStringSafe(ban.expires_at) < now
          )
            return true;
          if (
            filterStatus === "active" &&
            ban.revoked_at === null &&
            (ban.expires_at === null || toISOStringSafe(ban.expires_at) >= now)
          )
            return true;
          return false;
        })
      : bans;
  const userIds = Array.from(
    new Set(filteredBans.map((ban) => ban.community_platform_user_id)),
  );
  const moderatorIds = Array.from(
    new Set(filteredBans.map((ban) => ban.banned_by_user_id)),
  );
  const communitiesPromise =
    MyGlobal.prisma.community_platform_communities.findMany({
      where: { id: { in: [props.communityId] } },
      select: { id: true, name: true, description: true },
    });
  const usersPromise = MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: userIds } },
    select: { id: true, display_name: true },
  });
  const moderatorsPromise = MyGlobal.prisma.community_platform_users.findMany({
    where: { id: { in: moderatorIds } },
    select: { id: true, display_name: true },
  });
  const [communities, users, moderators] = await Promise.all([
    communitiesPromise,
    usersPromise,
    moderatorsPromise,
  ]);
  const userMap: Record<string, { id: string; display_name: string }> = {};
  for (const u of users) userMap[u.id] = u;
  const moderatorMap: Record<string, { id: string; display_name: string }> = {};
  for (const m of moderators) moderatorMap[m.id] = m;
  const communityMap: Record<
    string,
    { id: string; name: string; description: string }
  > = {};
  for (const c of communities) communityMap[c.id] = c;
  const data: ICommunityPlatformCommunityBan.ISummary[] = filteredBans.map(
    (ban) => ({
      id: ban.id,
      user: {
        id: userMap[ban.community_platform_user_id]?.id,
        display_name: userMap[ban.community_platform_user_id]?.display_name,
      },
      community: {
        id: communityMap[ban.community_platform_community_id]?.id,
        name: communityMap[ban.community_platform_community_id]?.name,
        description:
          communityMap[ban.community_platform_community_id]?.description,
      },
      reason: ban.reason,
      banned_by: {
        id: moderatorMap[ban.banned_by_user_id]?.id,
        display_name: moderatorMap[ban.banned_by_user_id]?.display_name,
      },
      banned_at: toISOStringSafe(ban.banned_at),
      expires_at:
        ban.expires_at !== null ? toISOStringSafe(ban.expires_at) : null,
      revoked_at:
        ban.revoked_at !== null ? toISOStringSafe(ban.revoked_at) : null,
    }),
  );
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };
  return { pagination, data };
}
