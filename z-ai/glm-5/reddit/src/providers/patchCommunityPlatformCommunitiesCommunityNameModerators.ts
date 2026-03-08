import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  // Resolve community by name (case-insensitive)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.community_platform_community_moderatorsWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };
  // Add username filter
  if (props.body.username !== undefined) {
    whereInput.member = {
      username: { contains: props.body.username, mode: "insensitive" },
    } satisfies Prisma.community_platform_membersWhereInput;
  }
  // Add date range filters (pass ISO string directly to Prisma)
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {
      gte: props.body.created_at_from,
      lte: props.body.created_at_to,
    };
  } else if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: props.body.created_at_from,
    };
  } else if (props.body.created_at_to !== undefined) {
    whereInput.created_at = {
      lte: props.body.created_at_to,
    };
  }
  // Build ORDER BY
  const sort = props.body.sort ?? "newest";
  const orderByInput: Prisma.community_platform_community_moderatorsOrderByWithRelationInput =
    sort === "username"
      ? { member: { username: "asc" } }
      : sort === "oldest"
        ? { created_at: "asc" }
        : { created_at: "desc" };
  // Query moderators with transformer select
  const moderators =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
    });
  // Count total
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: whereInput,
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    moderators,
    CommunityPlatformCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformCommunityModerator.ISummary;
}
