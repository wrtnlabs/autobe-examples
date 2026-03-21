import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmActivityLogAtSummaryTransformer } from "../transformers/ErpHrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminOrganizationsOrganizationIdActivityLogs(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmActivityLog.IRequest;
}): Promise<IPageIErpHrmActivityLog.ISummary> {
  // Authorization: Verified by AdminAuth decorator
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.erp_hrm_activity_logsWhereInput = {
    erp_hrm_organization_id: props.organizationId,
  };
  // Filter by action type
  if (props.body.actionType) {
    whereInput.action_type = props.body.actionType;
  }
  // Filter by member
  if (props.body.memberId) {
    whereInput.erp_hrm_member_id = props.body.memberId;
  }
  // Filter by date range
  if (props.body.startDate || props.body.endDate) {
    whereInput.created_at = {};
    if (props.body.startDate) {
      whereInput.created_at.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate) {
      whereInput.created_at.lte = new Date(props.body.endDate);
    }
  }
  // Determine sort order
  const orderByInput: Prisma.erp_hrm_activity_logsOrderByWithRelationInput =
    props.body.orderBy === "action_type"
      ? { action_type: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" };
  // Execute paginated query
  const data = await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmActivityLogAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_activity_logs.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmActivityLogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
