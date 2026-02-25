import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityModeratorAtSummaryTransformer } from "../transformers/CommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommunitiesCommunityNameModerators(props: {
  communityName: string;
  body: ICommunityModerator.IRequest;
}): Promise<IPageICommunityModerator.ISummary> {
  // Find community by name (case-insensitive uniqueness constraint)
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with optional search filter
  const whereInput = {
    community_id: community.id,
    ...(props.body.search && {
      member: {
        username: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.community_moderatorsWhereInput;
  // Query moderators with joins, sorting, and pagination
  const moderators = await MyGlobal.prisma.community_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ is_owner: "desc" }, { created_at: "asc" }],
    ...CommunityModeratorAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.community_moderators.count({
    where: whereInput,
  });
  // Transform to DTOs
  const data = await ArrayUtil.asyncMap(
    moderators,
    CommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityModerator.ISummary;
}
