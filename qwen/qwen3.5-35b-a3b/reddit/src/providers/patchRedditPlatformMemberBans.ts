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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberBans(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunityBan.IRequest;
}): Promise<IPageIRedditPlatformCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: { user_id: props.member.id },
      select: { community_id: true },
    });
  if (moderatorCommunities.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const communityIds = moderatorCommunities.map((c) => c.community_id);
  let where: Prisma.reddit_platform_community_bansWhereInput = {
    community_id: { in: communityIds },
  };
  if (props.body.status) {
    const now = new Date();
    switch (props.body.status) {
      case "active":
        where = {
          ...where,
          deleted_at: null,
          AND: [{ OR: [{ expires_at: null }, { expires_at: { gt: now } }] }],
        };
        break;
      case "expired":
        where = {
          ...where,
          AND: [{ expires_at: { not: null } }, { expires_at: { lte: now } }],
        };
        break;
      case "removed":
        where = { ...where, deleted_at: { not: null } };
        break;
    }
  }
  if (props.body.startDate) {
    const startDateFilter: Prisma.DateTimeFilter = {
      gte: props.body.startDate,
    };
    where = {
      ...where,
      AND: [where, { created_at: startDateFilter }],
    };
  }
  if (props.body.endDate) {
    const endDateFilter: Prisma.DateTimeFilter = { lte: props.body.endDate };
    where = {
      ...where,
      AND: [where, { created_at: endDateFilter }],
    };
  }
  if (props.body.userId) {
    where = { ...where, user_id: props.body.userId };
  }
  let effectiveWhere: Prisma.reddit_platform_community_bansWhereInput = where;
  if (props.body.communityName) {
    const filteredCommunities =
      await MyGlobal.prisma.reddit_platform_communities.findMany({
        where: {
          name: { contains: props.body.communityName, mode: "insensitive" },
          id: { in: communityIds },
        },
        select: { id: true },
      });
    if (filteredCommunities.length === 0) {
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      };
    }
    effectiveWhere = {
      ...where,
      community_id: { in: filteredCommunities.map((c) => c.id) },
    };
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy = {
    [sortBy]: sortOrder,
  } satisfies Prisma.reddit_platform_community_bansOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_platform_community_bans.findMany({
    where: effectiveWhere,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      user_id: true,
      community_id: true,
      banned_by: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      expires_at: true,
      bannedUser: RedditPlatformMemberAtSummaryTransformer.select(),
      community: RedditPlatformCommunityAtSummaryTransformer.select(),
      bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_community_bans.count({
    where: effectiveWhere,
  });
  const transformedData = await Promise.all(
    data.map(async (ban) => {
      const now = new Date();
      const isActive =
        ban.deleted_at === null &&
        (ban.expires_at === null || ban.expires_at > now);
      return {
        id: ban.id,
        user: await RedditPlatformMemberAtSummaryTransformer.transform(
          ban.bannedUser,
        ),
        community: await RedditPlatformCommunityAtSummaryTransformer.transform(
          ban.community,
        ),
        bannedBy: await RedditPlatformMemberAtSummaryTransformer.transform(
          ban.bannedBy,
        ),
        createdAt: ban.created_at.toISOString(),
        expiresAt: ban.expires_at?.toISOString() ?? null,
        deletedAt: ban.deleted_at?.toISOString() ?? null,
        isActive,
      } satisfies IRedditPlatformCommunityBan.ISummary;
    }),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
