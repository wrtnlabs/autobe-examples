import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationReportsResolution";
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

export async function patchCommunityPlatformAdminResolutions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationReportsResolution.IRequest;
}): Promise<IPageICommunityPlatformModerationReportsResolution.ISummary> {
  const { resolutionStatus, reportId, resolutionTimestampRange, moderatorId } =
    props.body;
  const page = 1;
  const limit = 100;
  const whereInput = {
    action: resolutionStatus ? { in: [resolutionStatus] } : undefined,
    community_platform_report_id: reportId,
    resolution_timestamp: resolutionTimestampRange
      ? {
          gte: resolutionTimestampRange.startDate,
          lte: resolutionTimestampRange.endDate,
        }
      : undefined,
    moderator_id: moderatorId,
  } satisfies Prisma.community_platform_moderation_reports_resolutionsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_reports_resolutions.findMany({
      where: whereInput,
      select: {
        id: true,
        action: true,
        resolution_reason: true,
        resolution_timestamp: true,
        community_platform_report_id: true,
        moderator_id: true,
      },
      orderBy: { resolution_timestamp: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    MyGlobal.prisma.community_platform_moderation_reports_resolutions.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map((item) => ({
      id: item.id,
      action: item.action,
      resolution_reason: item.resolution_reason,
      resolution_timestamp: toISOStringSafe(
        item.resolution_timestamp,
      ) as string & tags.Format<"date-time">,
      community_platform_report_id: item.community_platform_report_id,
      moderator_id: item.moderator_id,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
