import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostReport.IRequest;
}): Promise<IPageICommunityPlatformPostReport.ISummary> {
  // Authorization is enforced upstream; moderator is already authorized
  // Since IRequest doesn't have 'page' and 'limit', use defaults
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build Prisma where input without unknown filters
  const whereConditions: Prisma.community_platform_post_reportsWhereInput = {};
  // We avoid accessing properties not in IRequest
  const data = await MyGlobal.prisma.community_platform_post_reports.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      community_platform_user_id: true,
      community_platform_post_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_post_reports.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      community_platform_user_id: record.community_platform_user_id,
      community_platform_post_id: record.community_platform_post_id,
      reason: record.reason,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
