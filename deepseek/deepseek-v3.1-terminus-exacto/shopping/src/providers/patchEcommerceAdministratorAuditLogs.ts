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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceAuditLogAtSummaryTransformer } from "../transformers/EcommerceAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IEcommerceAuditLog.IRequest;
}): Promise<IPageIEcommerceAuditLog.ISummary> {
  // Validate request body format using typia
  typia.assert(props.body);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate at least one filter parameter is provided (excluding pagination)
  const { page: _, limit: __, ...filterFields } = props.body;
  const hasFilters = Object.values(filterFields).some(
    (value) => value !== undefined && value !== null,
  );
  if (!hasFilters) {
    throw new HttpException(
      "At least one filter parameter must be provided",
      400,
    );
  }
  // Build WHERE clause with proper validation
  const whereInput: Prisma.ecommerce_audit_logsWhereInput = {
    ...(props.body.event_type && { event_type: props.body.event_type }),
    ...(props.body.event_subtype && {
      event_subtype: props.body.event_subtype,
    }),
    ...(props.body.severity && { severity: props.body.severity }),
    ...(props.body.resource_type !== undefined && {
      resource_type: props.body.resource_type,
    }),
    ...(props.body.resource_id && { resource_id: props.body.resource_id }),
    ...(props.body.ip_address && { ip_address: props.body.ip_address }),
    ...(props.body.success !== undefined && { success: props.body.success }),
  };
  // Handle date range filtering with ISO string handling
  if (props.body.created_at_start || props.body.created_at_end) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_start) {
      if (!typia.is<tags.Format<"date-time">>(props.body.created_at_start)) {
        throw new HttpException(
          "Invalid start date format: must be ISO 8601",
          400,
        );
      }
      createdAtFilter.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      if (!typia.is<tags.Format<"date-time">>(props.body.created_at_end)) {
        throw new HttpException(
          "Invalid end date format: must be ISO 8601",
          400,
        );
      }
      createdAtFilter.lte = props.body.created_at_end;
    }
    if (Object.keys(createdAtFilter).length > 0) {
      whereInput.created_at = createdAtFilter;
    }
  }
  // Execute paginated query sequentially for better error handling
  const data = await MyGlobal.prisma.ecommerce_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_audit_logs.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceAuditLogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceAuditLog.ISummary;
}
