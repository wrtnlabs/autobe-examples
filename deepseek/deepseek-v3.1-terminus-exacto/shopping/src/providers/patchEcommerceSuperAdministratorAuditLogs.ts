import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceAuditLogAtSummaryTransformer } from "../transformers/EcommerceAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorAuditLogs(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceAuditLog.IRequest;
}): Promise<IPageIEcommerceAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate that at least one filter parameter is provided
  const hasFilters = [
    props.body.event_type,
    props.body.event_subtype,
    props.body.severity,
    props.body.resource_type,
    props.body.resource_id,
    props.body.ip_address,
    props.body.success !== undefined,
    props.body.created_at_start,
    props.body.created_at_end,
  ].some(Boolean);
  if (!hasFilters) {
    throw new HttpException(
      "At least one filter parameter must be provided",
      400,
    );
  }
  // Proper date handling without using Date constructor
  let createdStartDate: Date | undefined;
  let createdEndDate: Date | undefined;
  if (props.body.created_at_start) {
    createdStartDate = new Date(props.body.created_at_start);
    if (isNaN(createdStartDate.getTime())) {
      throw new HttpException("Invalid created_at_start date format", 400);
    }
  }
  if (props.body.created_at_end) {
    createdEndDate = new Date(props.body.created_at_end);
    if (isNaN(createdEndDate.getTime())) {
      throw new HttpException("Invalid created_at_end date format", 400);
    }
  }
  // Build WHERE clause for filtering
  const whereInput: Prisma.ecommerce_audit_logsWhereInput = {
    AND: [
      // Event type filtering
      ...(props.body.event_type ? [{ event_type: props.body.event_type }] : []),
      // Event subtype filtering
      ...(props.body.event_subtype
        ? [{ event_subtype: props.body.event_subtype }]
        : []),
      // Severity filtering
      ...(props.body.severity ? [{ severity: props.body.severity }] : []),
      // Resource type filtering - handle null explicitly
      ...(props.body.resource_type !== undefined
        ? [
            {
              resource_type:
                props.body.resource_type === null
                  ? null
                  : props.body.resource_type,
            },
          ]
        : []),
      // Resource ID filtering - handle null explicitly
      ...(props.body.resource_id !== undefined
        ? [
            {
              resource_id:
                props.body.resource_id === null ? null : props.body.resource_id,
            },
          ]
        : []),
      // IP address filtering
      ...(props.body.ip_address ? [{ ip_address: props.body.ip_address }] : []),
      // Success filtering
      ...(props.body.success !== undefined
        ? [{ success: props.body.success }]
        : []),
      // Date range filtering with validated dates
      ...(createdStartDate ? [{ created_at: { gte: createdStartDate } }] : []),
      ...(createdEndDate ? [{ created_at: { lte: createdEndDate } }] : []),
    ].filter(Boolean), // Remove empty arrays
  };
  // Query data first, then count for better performance
  const data = await MyGlobal.prisma.ecommerce_audit_logs.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...EcommerceAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_audit_logs.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAuditLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceAuditLog.ISummary;
}
