import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogDetailAtSummaryTransformer } from "../transformers/ErpHrmActivityLogDetailAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdActivityLogsActivityLogIdDetails(props: {
  member: MemberPayload;
  organizationId: string;
  activityLogId: string;
  body: IErpHrmActivityLogDetail.IRequest;
}): Promise<IPageIErpHrmActivityLogDetail.ISummary> {
  // Verify activity log exists and belongs to the organization
  await MyGlobal.prisma.erp_hrm_activity_logs.findUniqueOrThrow({
    where: {
      id: props.activityLogId,
      organization_id: props.organizationId,
    },
    select: { id: true },
  });
  // Build where clause with filters
  const where: Prisma.erp_hrm_activity_log_detailsWhereInput = {
    activity_log_id: props.activityLogId,
    ...(props.body.key !== undefined && { key: props.body.key }),
    ...(props.body.value !== undefined && {
      value: { contains: props.body.value },
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query paginated details
  const details = await MyGlobal.prisma.erp_hrm_activity_log_details.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmActivityLogDetailAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.erp_hrm_activity_log_details.count({
    where,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    details,
    ErpHrmActivityLogDetailAtSummaryTransformer.transform,
  );
  // Build pagination
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data,
    pagination,
  };
}
