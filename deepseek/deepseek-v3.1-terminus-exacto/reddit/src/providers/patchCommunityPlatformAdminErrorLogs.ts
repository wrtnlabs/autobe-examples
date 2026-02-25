import { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformErrorLogAtSummaryTransformer } from "../transformers/CommunityPlatformErrorLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminErrorLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformErrorLog.IRequest;
}): Promise<IPageICommunityPlatformErrorLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.community_platform_error_logsWhereInput = {
    ...(props.body.error_code && {
      error_code: { contains: props.body.error_code, mode: "insensitive" },
    }),
    ...(props.body.error_message && {
      error_message: {
        contains: props.body.error_message,
        mode: "insensitive",
      },
    }),
    ...(props.body.severity && { severity: props.body.severity }),
    ...(props.body.source_component && {
      source_component: props.body.source_component,
    }),
    ...(props.body.resolution_status && {
      resolution_status: props.body.resolution_status,
    }),
  };
  // Add date range filtering if provided
  if (props.body.occurred_at_start || props.body.occurred_at_end) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (props.body.occurred_at_start) {
      dateRange.gte = props.body.occurred_at_start;
    }
    if (props.body.occurred_at_end) {
      dateRange.lte = props.body.occurred_at_end;
    }
    whereInput.occurred_at = dateRange;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_error_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { occurred_at: "desc" },
      ...CommunityPlatformErrorLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_error_logs.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformErrorLogAtSummaryTransformer.transform,
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
