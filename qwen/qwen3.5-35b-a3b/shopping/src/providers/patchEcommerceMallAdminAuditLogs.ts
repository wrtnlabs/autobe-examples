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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminAuditLog.IRequest;
}): Promise<IPageIEcommerceMallAdminAuditLog.ISummary> {
  // Validate pagination parameters with proper null/undefined handling
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 50;
  const validatedLimit: number = limit > 100 ? 100 : limit;
  // Fetch admin details to check ban status and grade
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { id: props.admin.id },
    select: {
      id: true,
      email: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (admin === null) {
    throw new HttpException("Admin not found", 404);
  }
  if (admin.is_banned) {
    throw new HttpException("Admin account is banned", 403);
  }
  // Determine if admin is super
  const adminDetails = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { id: props.admin.id },
    select: { id: true, email: true, is_banned: true },
  });
  const isSuperAdmin = adminDetails !== null;
  // Build where clause
  const whereClause: Prisma.ecommerce_mall_admin_audit_logsWhereInput = {};
  // Authorization filtering: regular admins can only view their own logs
  if (!isSuperAdmin) {
    whereClause.admin_id = props.admin.id;
  }
  // Apply request filters
  if (props.body.adminId !== null) {
    whereClause.admin_id = props.body.adminId;
  }
  if (props.body.actionType !== null) {
    whereClause.action_type = props.body.actionType;
  }
  if (props.body.entityType !== null) {
    whereClause.target_entity_type = props.body.entityType;
  }
  if (props.body.entityId !== null) {
    whereClause.target_entity_id = props.body.entityId;
  }
  if (props.body.recordId !== null) {
    whereClause.request_id = props.body.recordId;
  }
  // Handle date range filtering
  if (props.body.dateRange !== null && props.body.dateRange !== undefined) {
    const { filterType, dates } = props.body.dateRange;
    if (dates.length > 0) {
      const parsedDates: Array<string & tags.Format<"date-time">> = dates;
      switch (filterType) {
        case "between":
          if (parsedDates.length >= 2) {
            whereClause.created_at = {
              gte: parsedDates[0],
              lte: parsedDates[1],
            };
          }
          break;
        case "before":
          if (parsedDates.length === 1) {
            whereClause.created_at = {
              lte: parsedDates[0],
            };
          }
          break;
        case "after":
          if (parsedDates.length === 1) {
            whereClause.created_at = {
              gte: parsedDates[0],
            };
          }
          break;
        case "within_range":
          if (parsedDates.length >= 2) {
            whereClause.created_at = {
              gte: parsedDates[0],
              lte: parsedDates[parsedDates.length - 1],
            };
          }
          break;
        case "specific_date":
          if (parsedDates.length === 1) {
            const dateOnly = parsedDates[0].split("T")[0] as string &
              tags.Format<"date-time">;
            const startOfDay = (dateOnly + "T00:00:00Z") as string &
              tags.Format<"date-time">;
            const endOfDay = (dateOnly + "T23:59:59Z") as string &
              tags.Format<"date-time">;
            whereClause.created_at = {
              gte: startOfDay,
              lt: (endOfDay + "0.001Z") as string & tags.Format<"date-time">,
            };
          }
          break;
        case "since":
          if (parsedDates.length === 1) {
            whereClause.created_at = {
              gte: parsedDates[0],
            };
          }
          break;
        case "until":
          if (parsedDates.length === 1) {
            whereClause.created_at = {
              lte: parsedDates[0],
            };
          }
          break;
      }
    }
  }
  // Build cursor pagination
  const cursor = props.body.cursor !== null ? props.body.cursor : undefined;
  const skip = cursor !== undefined ? 1 : (page - 1) * validatedLimit;
  const take = validatedLimit + (cursor !== undefined ? 1 : 0);
  // Build orderBy
  const sortBy = props.body.sortBy ?? "timestamp";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const orderByInput: Prisma.ecommerce_mall_admin_audit_logsOrderByWithRelationInput =
    {
      created_at: sortOrder === "ASC" ? "asc" : "desc",
    };
  if (sortBy === "adminId") {
    orderByInput.admin_id = sortOrder === "ASC" ? "asc" : "desc";
  }
  if (sortBy === "actionType") {
    orderByInput.action_type = sortOrder === "ASC" ? "asc" : "desc";
  }
  // Fetch data with includes for relationships
  const data = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findMany({
    where: whereClause,
    skip,
    take,
    orderBy: orderByInput,
    select: {
      id: true,
      admin_id: true,
      action_type: true,
      target_entity_type: true,
      target_entity_id: true,
      created_at: true,
      updated_at: true,
      changes: true,
      previous_values: true,
      new_values: true,
      request_id: true,
      ip_address: true,
      user_agent: true,
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.count({
    where: whereClause,
  });
  // Transform admin data to summary format
  const transformAdminToSummary = async (
    adminId: string,
  ): Promise<IEcommerceMallAdmin.ISummary> => {
    const adminRecord = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (adminRecord === null) {
      throw new HttpException("Admin record not found", 404);
    }
    return {
      id: adminRecord.id as string & tags.Format<"uuid">,
      email: adminRecord.email,
      is_banned: adminRecord.is_banned,
      created_at: toISOStringSafe(adminRecord.created_at),
      updated_at: toISOStringSafe(adminRecord.updated_at),
    };
  };
  // Transform audit log records to response format
  const transformedData: IEcommerceMallAdminAuditLog.ISummary[] =
    await ArrayUtil.asyncMap(data, async (record) => {
      const adminSummary: IEcommerceMallAdmin.ISummary =
        await transformAdminToSummary(record.admin_id);
      const changesValue: string | IEcommerceMallAdminAuditLog.IChange =
        (() => {
          if (record.changes !== null && record.changes !== undefined) {
            try {
              const parsed = JSON.parse(record.changes);
              return {
                oldValues:
                  parsed.oldValues !== null && parsed.oldValues !== undefined
                    ? (parsed.oldValues as {
                        [key: string]: string;
                      })
                    : {},
                newValues:
                  parsed.newValues !== null && parsed.newValues !== undefined
                    ? (parsed.newValues as {
                        [key: string]: string;
                      })
                    : {},
              } satisfies IEcommerceMallAdminAuditLog.IChange;
            } catch {
              return record.changes;
            }
          }
          return "No changes recorded";
        })();
      const summary: IEcommerceMallAdminAuditLog.ISummary = {
        id: record.id as string & tags.Format<"uuid">,
        type: "admin_log",
        timestamp: toISOStringSafe(record.created_at),
        user: adminSummary,
        operationType: record.action_type,
        recordType: record.target_entity_type,
        entityType: record.target_entity_type,
        entityId:
          record.target_entity_id !== null &&
          record.target_entity_id !== undefined
            ? (record.target_entity_id as string & tags.Format<"uuid">)
            : ("00000000-0000-0000-0000-000000000000" as string &
                tags.Format<"uuid">),
        recordId:
          record.request_id !== null && record.request_id !== undefined
            ? (record.request_id as string & tags.Format<"uuid">)
            : undefined,
        changes: changesValue,
        status: "active",
      };
      return summary;
    });
  // Calculate pagination metadata
  const currentPage: number = page;
  const totalPages: number = Math.ceil(total / validatedLimit);
  return {
    pagination: {
      current: currentPage,
      limit: validatedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallAdminAuditLog.ISummary;
}
