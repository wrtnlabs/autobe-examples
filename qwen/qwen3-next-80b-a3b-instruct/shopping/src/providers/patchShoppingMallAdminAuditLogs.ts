import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAuditLog.IRequest;
}): Promise<IPageIShoppingMallAuditLog> {
  const {
    search,
    event_type,
    status,
    source,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = props.body;

  // Validate pagination parameters
  const pageNumber = Math.max(1, page);
  const limitNumber = Math.min(Math.max(1, limit), 100);
  const skip = (pageNumber - 1) * limitNumber;

  // Build complex where condition with all possible filters
  const whereConditions: Record<string, any> = {
    deleted_at: null,
  };

  // Full-text search on event_details using JSON search
  if (search) {
    whereConditions.event_details = {
      contains: search,
    };
  }

  // Filter by event_type if provided
  if (event_type) {
    whereConditions.event_type = event_type;
  }

  // Filter by status if provided
  if (status) {
    whereConditions.status = status;
  }

  // Filter by source if provided
  if (source) {
    whereConditions.source = source;
  }

  // Apply date range filters if provided
  if (start_date || end_date) {
    whereConditions.created_at = {};

    if (start_date) {
      whereConditions.created_at.gte = start_date;
    }

    if (end_date) {
      whereConditions.created_at.lte = end_date;
    }
  }

  // Retrieve paginated results
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_audit_logs.findMany({
      where: whereConditions,
      skip,
      take: limitNumber,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.shopping_mall_audit_logs.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match DTO structure - return only the string ID since IShoppingMallAuditLog is a string type
  const transformedLogs = logs.map((log) => log.id);

  // Return paginated response
  return {
    pagination: {
      current: pageNumber,
      limit: limitNumber,
      records: total,
      pages: Math.ceil(total / limitNumber),
    },
    data: transformedLogs,
  };
}
