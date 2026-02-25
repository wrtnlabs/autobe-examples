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

export async function patchCommunityPlatformCommunitiesCommunityIdAnnouncements(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityAnnouncement.IRequest;
}): Promise<IPageICommunityPlatformCommunityAnnouncement.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Build WHERE clause
  const whereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.is_pinned !== undefined && {
      is_pinned: props.body.is_pinned,
    }),
  } satisfies Prisma.community_platform_community_announcementsWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data
  const data =
    await MyGlobal.prisma.community_platform_community_announcements.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ is_pinned: "desc" }, { created_at: "desc" }],
      ...CommunityPlatformCommunityAnnouncementAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.community_platform_community_announcements.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformCommunityAnnouncementAtSummaryTransformer.transform,
  );
  // Calculate pages safely
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
