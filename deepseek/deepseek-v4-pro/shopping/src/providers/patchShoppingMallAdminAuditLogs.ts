import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
  const limit: number = props.body.limit ?? 20;
  const whereInput: Prisma.shopping_mall_admin_audit_logsWhereInput = {};
  if (props.body.action_type !== undefined) {
    whereInput.action_type = props.body.action_type;
  }
  if (props.body.target_entity_type !== undefined) {
    whereInput.target_entity_type = props.body.target_entity_type;
  }
  if (props.body.target_entity_id !== undefined) {
    whereInput.target_entity_id = props.body.target_entity_id;
  }
  if (props.body.shopping_mall_admin_id !== undefined) {
    whereInput.shopping_mall_admin_id = props.body.shopping_mall_admin_id;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at_from !== undefined) {
      dateFilter.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      dateFilter.lte = props.body.created_at_to;
    }
    whereInput.created_at = dateFilter;
  }
  const cursor: string | undefined = props.body.cursor;
  if (cursor !== undefined) {
    const cursorValues = parseCursor(cursor);
    if (cursorValues === null) {
      throw new HttpException("Invalid cursor format", 400);
    }
    const cursorCreatedAt: string = cursorValues.created_at;
    const cursorId: string = cursorValues.id;
    const cursorWhere: Prisma.shopping_mall_admin_audit_logsWhereInput = {
      OR: [
        { created_at: { lt: cursorCreatedAt } },
        {
          created_at: { equals: cursorCreatedAt },
          id: { lt: cursorId },
        },
      ],
    };
    const combinedWhere: Prisma.shopping_mall_admin_audit_logsWhereInput =
      Object.keys(whereInput).length > 0
        ? { AND: [whereInput, cursorWhere] }
        : cursorWhere;
    const fetched =
      await MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
        where: combinedWhere,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...ShoppingMallAdminAuditLogAtSummaryTransformer.select(),
      });
    const hasMore: boolean = fetched.length > limit;
    const paginatedRecords = hasMore ? fetched.slice(0, limit) : fetched;
    const total: number =
      await MyGlobal.prisma.shopping_mall_admin_audit_logs.count({
        where: whereInput,
      });
    return {
      pagination: {
        current: 1,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        paginatedRecords,
        ShoppingMallAdminAuditLogAtSummaryTransformer.transform,
      ),
    };
  }
  const pageValue: number | null | undefined = props.body.page;
  const page: number =
    pageValue === null || pageValue === undefined ? 1 : pageValue;
  const skip: number = (page - 1) * limit;
  const fetched = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany(
    {
      where: whereInput,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      ...ShoppingMallAdminAuditLogAtSummaryTransformer.select(),
    },
  );
  const total: number =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      fetched,
      ShoppingMallAdminAuditLogAtSummaryTransformer.transform,
    ),
  };
}
function parseCursor(raw: string): {
  created_at: string;
  id: string;
} | null {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(raw, "base64").toString("utf-8"),
    );
    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }
    if (!("created_at" in decoded) || !("id" in decoded)) {
      return null;
    }
    const record: Record<string, unknown> = decoded as Record<string, unknown>;
    if (
      typeof record.created_at !== "string" ||
      typeof record.id !== "string"
    ) {
      return null;
    }
    return { created_at: record.created_at, id: record.id };
  } catch {
    return null;
  }
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
// import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
// import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminAuditLogs(props: {
//   admin: AdminPayload;
//   body: IShoppingMallAdminAuditLog.IRequest;
// }): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
//     ...ShoppingMallAdminAuditLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdminAuditLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------