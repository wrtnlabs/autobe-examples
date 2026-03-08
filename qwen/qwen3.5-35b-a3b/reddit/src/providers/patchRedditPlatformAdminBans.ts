import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminBans(props: {
  admin: AdminPayload;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const startDate = props.body.startDate;
  const endDate = props.body.endDate;
  const userId = props.body.userId;
  const communityName = props.body.communityName;
  const statusFilter = props.body.status;
  const sortByField = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereConditions: Prisma.reddit_platform_community_bansWhereInput = {
    user_id: userId,
    community: communityName ? { name: communityName } : undefined,
  };
  if (statusFilter === "removed") {
    whereConditions.deleted_at = { not: null };
  } else if (statusFilter === "active") {
    whereConditions.deleted_at = null;
  } else if (statusFilter === "expired") {
    whereConditions.expires_at = { lte: new Date() };
  }
  // Build created_at condition from startDate and endDate
  const createdAtFilter:
    | Prisma.DateTimeFilter<"reddit_platform_community_bans">
    | undefined = {};
  let hasCreatedAtFilter = false;
  if (startDate) {
    createdAtFilter.gte = new Date(startDate);
    hasCreatedAtFilter = true;
  }
  if (endDate) {
    createdAtFilter.lte = new Date(endDate);
    hasCreatedAtFilter = true;
  }
  if (hasCreatedAtFilter) {
    whereConditions.created_at = createdAtFilter;
  }
  const bans = await MyGlobal.prisma.reddit_platform_community_bans.findMany({
    where: whereConditions,
    select: {
      id: true,
      created_at: true,
      deleted_at: true,
      expires_at: true,
      user_id: true,
      community_id: true,
      banned_by: true,
    },
    skip,
    take: limit,
    orderBy: {
      [sortByField]: sortOrder,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_community_bans.count({
    where: whereConditions,
  });
  const now = new Date();
  const data = bans.map((ban) => {
    const isActive =
      ban.deleted_at === null &&
      (ban.expires_at === null || ban.expires_at > now);
    return {
      id: ban.id as string & tags.Format<"uuid">,
      user: {
        id: ban.user_id as string & tags.Format<"uuid">,
        username: "",
        displayName: "",
        bio: "",
        avatarUrl: "",
        karmaScore: 0,
        createdAt: toISOStringSafe(ban.created_at),
        subscriptionCount: 0,
      } satisfies IRedditPlatformMember.ISummary,
      community: {
        id: ban.community_id as string & tags.Format<"uuid">,
        name: "",
        description: "",
        icon_url: "",
        subscriber_count: 0,
        author: {
          id: "" as string & tags.Format<"uuid">,
          username: "",
          displayName: "",
          bio: "",
          avatarUrl: "",
          karmaScore: 0,
          createdAt: toISOStringSafe(new Date()),
          subscriptionCount: 0,
        } satisfies IRedditPlatformMember.ISummary,
        created_at: toISOStringSafe(ban.created_at),
      } satisfies IRedditPlatformCommunity.ISummary,
      bannedBy: {
        id: ban.banned_by as string & tags.Format<"uuid">,
        username: "",
        displayName: "",
        bio: "",
        avatarUrl: "",
        karmaScore: 0,
        createdAt: toISOStringSafe(ban.created_at),
        subscriptionCount: 0,
      } satisfies IRedditPlatformMember.ISummary,
      createdAt: toISOStringSafe(ban.created_at),
      expiresAt: ban.expires_at ? toISOStringSafe(ban.expires_at) : null,
      deletedAt: ban.deleted_at ? toISOStringSafe(ban.deleted_at) : null,
      isActive,
    } satisfies IRedditPlatformCommunityBan.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformCommunityBan.ISummary;
}
