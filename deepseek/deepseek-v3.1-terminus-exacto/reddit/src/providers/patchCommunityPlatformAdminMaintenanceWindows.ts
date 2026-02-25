import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMaintenanceWindow";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMaintenanceWindowAtSummaryTransformer } from "../transformers/CommunityPlatformMaintenanceWindowAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminMaintenanceWindows(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMaintenanceWindow.IRequest;
}): Promise<IPageICommunityPlatformMaintenanceWindow.ISummary> {
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereClause = {
    deleted_at: null,
    ...(props.body.title && {
      title: { contains: props.body.title, mode: "insensitive" as const },
    }),
    ...(props.body.description && {
      description: {
        contains: props.body.description,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.maintenance_type && {
      maintenance_type: props.body.maintenance_type,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.impact_level && { impact_level: props.body.impact_level }),
  } satisfies Prisma.community_platform_maintenance_windowsWhereInput;
  // Handle date range filters
  if (props.body.scheduled_start && props.body.scheduled_end) {
    const startDate = new Date(props.body.scheduled_start);
    const endDate = new Date(props.body.scheduled_end);
    (whereClause as any).scheduled_start = { gte: startDate, lte: endDate };
  } else {
    if (props.body.scheduled_start) {
      const startDate = new Date(props.body.scheduled_start);
      (whereClause as any).scheduled_start = { gte: startDate };
    }
    if (props.body.scheduled_end) {
      const endDate = new Date(props.body.scheduled_end);
      (whereClause as any).scheduled_end = { lte: endDate };
    }
  }
  // Fetch data with pagination
  const data =
    await MyGlobal.prisma.community_platform_maintenance_windows.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { scheduled_start: "desc" as const },
      ...CommunityPlatformMaintenanceWindowAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_maintenance_windows.count({
      where: whereClause,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformMaintenanceWindowAtSummaryTransformer.transform,
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
