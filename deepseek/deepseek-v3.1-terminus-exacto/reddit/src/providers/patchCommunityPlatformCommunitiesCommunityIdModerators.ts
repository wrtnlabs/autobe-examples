import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function patchCommunityPlatformCommunitiesCommunityIdModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  // Verify community exists and is not deleted
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Set pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause using relation property name - fix is_active handling
  const whereInput: Prisma.community_platform_community_moderatorsWhereInput = {
    community: { id: props.communityId },
    deleted_at: null,
    // Handle is_active properly - exclude null values
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    ...(props.body.role_level !== undefined && {
      role_level: props.body.role_level,
    }),
    ...(props.body.assigned_at_start !== undefined && {
      assigned_at: { gte: new Date(props.body.assigned_at_start) },
    }),
    ...(props.body.assigned_at_end !== undefined && {
      assigned_at: { lte: new Date(props.body.assigned_at_end) },
    }),
    ...(props.body.search !== undefined && {
      notes: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  // Get paginated data with transformer - ensure transformer includes required relations
  const data =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [
        { is_active: "desc" as const },
        { assigned_at: "desc" as const },
      ],
      ...CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
    });
  // Get total count with same WHERE
  const total =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: whereInput,
    });
  // Transform data using transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityModeratorAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
