import { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityAnnouncement";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityAnnouncementAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAnnouncementAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformCommunitiesCommunityIdAnnouncementsSearch(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityAnnouncement.IRequest;
}): Promise<IPageICommunityPlatformCommunityAnnouncement.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build where conditions with type safety
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.is_pinned !== undefined && {
      is_pinned: props.body.is_pinned,
    }),
  } satisfies Prisma.community_platform_community_announcementsWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.community_platform_community_announcements.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [
        { is_pinned: "desc" },
        { created_at: "desc" },
      ] satisfies Prisma.community_platform_community_announcementsOrderByWithRelationInput[],
      ...CommunityPlatformCommunityAnnouncementAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_community_announcements.count({
      where: whereInput,
    });
  // Transform data using ArrayUtil.asyncMap
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityAnnouncementAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
