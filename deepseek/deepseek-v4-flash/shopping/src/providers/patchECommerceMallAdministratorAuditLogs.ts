import { IECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministratorAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorAuditLogs(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallSuperAdministratorAuditLog.IRequest;
}): Promise<IPageIECommerceMallSuperAdministratorAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort === "asc" ? ("asc" as const) : ("desc" as const);
  const actorType = props.body.actorType ?? "both";
  const actionFilter = props.body.action
    ?.split(",")
    .map((a) => a.trim())
    .filter((a) => a.length > 0);
  const targetTypeFilter = props.body.targetType;
  const fromDate = props.body.from;
  const toDate = props.body.to;
  const allRecords: Array<{
    id: string;
    action: string;
    actor_type: string;
    actor_id: string;
    actor_email: string;
    target_type: string;
    target_id: string;
    reason: string | null;
    created_at: string;
  }> = [];
  if (actorType === "administrator" || actorType === "both") {
    const adminWhere: Prisma.e_commerce_mall_administrator_audit_logsWhereInput =
      {
        deleted_at: null,
      };
    if (targetTypeFilter !== undefined) {
      adminWhere.target_type = targetTypeFilter;
    }
    if (actionFilter !== undefined && actionFilter.length > 0) {
      adminWhere.action_type = { in: actionFilter };
    }
    if (fromDate !== undefined || toDate !== undefined) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (fromDate !== undefined) {
        dateFilter.gte = fromDate;
      }
      if (toDate !== undefined) {
        dateFilter.lte = toDate;
      }
      adminWhere.created_at = dateFilter;
    }
    const adminData =
      await MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.findMany({
        where: adminWhere,
        select: {
          id: true,
          action_type: true,
          target_type: true,
          target_id: true,
          reason: true,
          created_at: true,
          e_commerce_mall_administrator_id: true,
          administrator: {
            select: {
              email: true,
            },
          } satisfies Prisma.e_commerce_mall_administratorsFindManyArgs,
        },
      });
    for (const r of adminData) {
      allRecords.push({
        id: r.id,
        action: r.action_type,
        actor_type: "administrator",
        actor_id: r.e_commerce_mall_administrator_id,
        actor_email: r.administrator.email,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        created_at: r.created_at.toISOString(),
      });
    }
  }
  if (actorType === "superAdministrator" || actorType === "both") {
    const superAdminWhere: Prisma.e_commerce_mall_super_administrator_audit_logsWhereInput =
      {};
    if (targetTypeFilter !== undefined) {
      superAdminWhere.target_type = targetTypeFilter;
    }
    if (actionFilter !== undefined && actionFilter.length > 0) {
      superAdminWhere.action = { in: actionFilter };
    }
    if (fromDate !== undefined || toDate !== undefined) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (fromDate !== undefined) {
        dateFilter.gte = fromDate;
      }
      if (toDate !== undefined) {
        dateFilter.lte = toDate;
      }
      superAdminWhere.created_at = dateFilter;
    }
    const superAdminData =
      await MyGlobal.prisma.e_commerce_mall_super_administrator_audit_logs.findMany(
        {
          where: superAdminWhere,
          select: {
            id: true,
            action: true,
            target_type: true,
            target_id: true,
            reason: true,
            created_at: true,
            e_commerce_mall_super_administrator_id: true,
            superAdministrator: {
              select: {
                email: true,
              },
            } satisfies Prisma.e_commerce_mall_super_administratorsFindManyArgs,
          },
        },
      );
    for (const r of superAdminData) {
      allRecords.push({
        id: r.id,
        action: r.action,
        actor_type: "superAdministrator",
        actor_id: r.e_commerce_mall_super_administrator_id,
        actor_email: r.superAdministrator.email,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        created_at: r.created_at.toISOString(),
      });
    }
  }
  const total = allRecords.length;
  allRecords.sort((a, b) => {
    const cmp = a.created_at.localeCompare(b.created_at);
    return sort === "asc" ? cmp : -cmp;
  });
  const paginatedRecords = allRecords.slice(skip, skip + limit);
  const data = paginatedRecords.map(
    (r) =>
      ({
        id: r.id,
        action: r.action,
        actor_type: r.actor_type,
        actor_id: r.actor_id,
        actor_email: r.actor_email,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        created_at: r.created_at,
      }) satisfies IECommerceMallSuperAdministratorAuditLog.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallSuperAdministratorAuditLog.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministratorAuditLog";
// import { IPageIECommerceMallSuperAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministratorAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorAuditLogs(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallSuperAdministratorAuditLog.IRequest;
// }): Promise<IPageIECommerceMallSuperAdministratorAuditLog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------