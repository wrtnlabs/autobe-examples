import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityNameBans(props: {
  member: {
    id: string;
  };
  communityName: string;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // Find the community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { name: props.communityName },
    });
  // Check authorization: must be owner or moderator
  const isOwner = community.owner_id === props.member.id;
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const isModerator = moderatorRecord !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const offset = (page - 1) * limit;
  // Build where clause
  const whereClause: Prisma.community_platform_community_bansWhereInput = {
    community_id: community.id,
    deleted_at: props.body.status === "active" ? null : undefined,
  };
  // Add username filter (case-insensitive partial match)
  if (props.body.username !== undefined) {
    whereClause.bannedUser = {
      username: { contains: props.body.username, mode: "insensitive" },
    };
  }
  // Add reason filter (nullable handling)
  if (props.body.reason !== undefined) {
    if (props.body.reason === null) {
      whereClause.reason = null;
    } else {
      whereClause.reason = { contains: props.body.reason, mode: "insensitive" };
    }
  }
  // Add date range filters
  if (props.body.from !== undefined || props.body.to !== undefined) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.from !== undefined) {
      dateFilter.gte = new Date(props.body.from);
    }
    if (props.body.to !== undefined) {
      dateFilter.lte = new Date(props.body.to);
    }
    whereClause.created_at = dateFilter;
  }
  // Query bans (sequential execution per guidelines)
  const bans = await MyGlobal.prisma.community_platform_community_bans.findMany(
    {
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformCommunityBanAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.community_platform_community_bans.count({
    where: whereClause,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    bans,
    CommunityPlatformCommunityBanAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
