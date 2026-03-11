import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAuditLogAtSummaryTransformer } from "../transformers/EcommerceMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  // Verify super administrator grade
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true },
  });
  if (admin.id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {
    admin_id: props.body.admin_id,
    action_type: props.body.action_type,
    target_entity_type: props.body.target_entity_type,
    target_entity_id: props.body.target_entity_id,
    ip_address: props.body.ip_address,
  } satisfies Prisma.ecommerce_mall_admin_audit_logsWhereInput;
  // Add date range filter
  if (props.body.date_range !== undefined) {
    const dateRangeFilter: Prisma.DateTimeFilter = {};
    if (props.body.date_range.start_date !== undefined) {
      dateRangeFilter.gte = props.body.date_range.start_date;
    }
    if (props.body.date_range.end_date !== undefined) {
      dateRangeFilter.lte = props.body.date_range.end_date;
    }
    whereInput.created_at = dateRangeFilter;
  }
  // Add text search if provided - using contains for changes field
  if (props.body.text_search !== undefined && props.body.text_search !== "") {
    if (!whereInput.changes) {
      whereInput.changes = {};
    }
    if (typeof whereInput.changes === "object") {
      whereInput.changes.contains = props.body.text_search;
    }
  }
  // Determine sorting - default to created_at DESC
  const orderByInput: Prisma.ecommerce_mall_admin_audit_logsOrderByWithRelationInput[] =
    [
      {
        admin_id: props.body.sort === "admin_id" ? "desc" : undefined,
        action_type: props.body.sort === "action_type" ? "desc" : undefined,
        target_entity_type:
          props.body.sort === "target_entity_type" ? "desc" : undefined,
        created_at: "desc" as const,
      },
    ];
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallAdminAuditLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallAdminAuditLogAtSummaryTransformer.transform,
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
