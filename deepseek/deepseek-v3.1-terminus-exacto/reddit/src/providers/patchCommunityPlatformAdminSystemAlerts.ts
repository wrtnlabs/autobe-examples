import { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemAlert";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemAlertAtSummaryTransformer } from "../transformers/CommunityPlatformSystemAlertAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSystemAlerts(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemAlert.IRequest;
}): Promise<IPageICommunityPlatformSystemAlert.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper date handling
  const whereInput = {
    ...(props.body.alert_type !== undefined &&
      props.body.alert_type !== null && { alert_type: props.body.alert_type }),
    ...(props.body.severity !== undefined &&
      props.body.severity !== null && { severity: props.body.severity }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.source_component !== undefined &&
      props.body.source_component !== null && {
        source_component: props.body.source_component,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null &&
      props.body.search.trim() !== "" && {
        OR: [
          { title: { contains: props.body.search.trim() } },
          { description: { contains: props.body.search.trim() } },
        ],
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null &&
      props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null &&
      (props.body.created_at_end === undefined ||
        props.body.created_at_end === null) && {
        created_at: { gte: props.body.created_at_start },
      }),
    ...((props.body.created_at_start === undefined ||
      props.body.created_at_start === null) &&
      props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: { lte: props.body.created_at_end },
      }),
  } satisfies Prisma.community_platform_system_alertsWhereInput;
  // Create custom orderBy for severity (critical > high > medium > low)
  const severityOrder = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  // First get data with proper ordering
  const data = await MyGlobal.prisma.community_platform_system_alerts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" as const }],
    ...CommunityPlatformSystemAlertAtSummaryTransformer.select(),
  });
  // Manually sort by severity after fetching
  const sortedData = data.sort((a, b) => {
    const severityA =
      severityOrder[a.severity as keyof typeof severityOrder] ?? 5;
    const severityB =
      severityOrder[b.severity as keyof typeof severityOrder] ?? 5;
    return severityA - severityB;
  });
  const total = await MyGlobal.prisma.community_platform_system_alerts.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    sortedData,
    CommunityPlatformSystemAlertAtSummaryTransformer.transform,
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
