import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const typesToQuery: Array<"customer" | "seller" | "admin" | "guest"> =
    body.actorType
      ? [body.actorType]
      : ["customer", "seller", "admin", "guest"];
  interface SessionRow {
    actorType: "customer" | "seller" | "admin" | "guest";
    id: string;
    actorId: string;
    ip: string;
    href: string;
    referrer: string;
    created_at: string;
    expired_at: string;
  }
  const allResults: SessionRow[] = [];
  const counts: number[] = [];
  for (const actorType of typesToQuery) {
    if (actorType === "customer") {
      const where: Prisma.shopping_mall_customer_sessionsWhereInput = {};
      if (body.ip !== undefined) {
        where.ip = { contains: body.ip };
      }
      if (body.actorId !== undefined) {
        where.shopping_mall_customer_id = body.actorId;
      }
      if (body.createdFrom !== undefined || body.createdTo !== undefined) {
        where.created_at = {
          ...(body.createdFrom !== undefined && {
            gte: new Date(body.createdFrom),
          }),
          ...(body.createdTo !== undefined && {
            lt: new Date(body.createdTo),
          }),
        };
      }
      if (
        body.expiredFrom !== undefined ||
        body.expiredTo !== undefined ||
        body.isActive !== undefined
      ) {
        where.expired_at = {
          ...(body.expiredFrom !== undefined && {
            gte: new Date(body.expiredFrom),
          }),
          ...(body.expiredTo !== undefined && {
            lt: new Date(body.expiredTo),
          }),
          ...(body.isActive === true && { gt: new Date() }),
          ...(body.isActive === false && { lte: new Date() }),
        };
      }
      const [rows, count] = await Promise.all([
        MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
          where,
          select: {
            id: true,
            shopping_mall_customer_id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        }),
        MyGlobal.prisma.shopping_mall_customer_sessions.count({ where }),
      ]);
      counts.push(count);
      for (const row of rows) {
        allResults.push({
          actorType: "customer",
          id: row.id,
          actorId: row.shopping_mall_customer_id,
          ip: row.ip,
          href: row.href,
          referrer: row.referrer,
          created_at: toISOStringSafe(row.created_at),
          expired_at: toISOStringSafe(row.expired_at),
        });
      }
    } else if (actorType === "seller") {
      const where: Prisma.shopping_mall_seller_sessionsWhereInput = {};
      if (body.ip !== undefined) {
        where.ip = { contains: body.ip };
      }
      if (body.actorId !== undefined) {
        where.seller_id = body.actorId;
      }
      if (body.createdFrom !== undefined || body.createdTo !== undefined) {
        where.created_at = {
          ...(body.createdFrom !== undefined && {
            gte: new Date(body.createdFrom),
          }),
          ...(body.createdTo !== undefined && {
            lt: new Date(body.createdTo),
          }),
        };
      }
      if (
        body.expiredFrom !== undefined ||
        body.expiredTo !== undefined ||
        body.isActive !== undefined
      ) {
        where.expired_at = {
          ...(body.expiredFrom !== undefined && {
            gte: new Date(body.expiredFrom),
          }),
          ...(body.expiredTo !== undefined && {
            lt: new Date(body.expiredTo),
          }),
          ...(body.isActive === true && { gt: new Date() }),
          ...(body.isActive === false && { lte: new Date() }),
        };
      }
      const [rows, count] = await Promise.all([
        MyGlobal.prisma.shopping_mall_seller_sessions.findMany({
          where,
          select: {
            id: true,
            seller_id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        }),
        MyGlobal.prisma.shopping_mall_seller_sessions.count({ where }),
      ]);
      counts.push(count);
      for (const row of rows) {
        allResults.push({
          actorType: "seller",
          id: row.id,
          actorId: row.seller_id,
          ip: row.ip,
          href: row.href,
          referrer: row.referrer,
          created_at: toISOStringSafe(row.created_at),
          expired_at: toISOStringSafe(row.expired_at),
        });
      }
    } else if (actorType === "admin") {
      const where: Prisma.shopping_mall_admin_sessionsWhereInput = {};
      if (body.ip !== undefined) {
        where.ip = { contains: body.ip };
      }
      if (body.actorId !== undefined) {
        where.shopping_mall_admin_id = body.actorId;
      }
      if (body.createdFrom !== undefined || body.createdTo !== undefined) {
        where.created_at = {
          ...(body.createdFrom !== undefined && {
            gte: new Date(body.createdFrom),
          }),
          ...(body.createdTo !== undefined && {
            lt: new Date(body.createdTo),
          }),
        };
      }
      if (
        body.expiredFrom !== undefined ||
        body.expiredTo !== undefined ||
        body.isActive !== undefined
      ) {
        where.expired_at = {
          ...(body.expiredFrom !== undefined && {
            gte: new Date(body.expiredFrom),
          }),
          ...(body.expiredTo !== undefined && {
            lt: new Date(body.expiredTo),
          }),
          ...(body.isActive === true && { gt: new Date() }),
          ...(body.isActive === false && { lte: new Date() }),
        };
      }
      const [rows, count] = await Promise.all([
        MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
          where,
          select: {
            id: true,
            shopping_mall_admin_id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        }),
        MyGlobal.prisma.shopping_mall_admin_sessions.count({ where }),
      ]);
      counts.push(count);
      for (const row of rows) {
        allResults.push({
          actorType: "admin",
          id: row.id,
          actorId: row.shopping_mall_admin_id,
          ip: row.ip,
          href: row.href,
          referrer: row.referrer,
          created_at: toISOStringSafe(row.created_at),
          expired_at: toISOStringSafe(row.expired_at),
        });
      }
    } else if (actorType === "guest") {
      const where: Prisma.shopping_mall_guest_sessionsWhereInput = {};
      if (body.ip !== undefined) {
        where.ip = { contains: body.ip };
      }
      if (body.actorId !== undefined) {
        where.shopping_mall_guest_id = body.actorId;
      }
      if (body.createdFrom !== undefined || body.createdTo !== undefined) {
        where.created_at = {
          ...(body.createdFrom !== undefined && {
            gte: new Date(body.createdFrom),
          }),
          ...(body.createdTo !== undefined && {
            lt: new Date(body.createdTo),
          }),
        };
      }
      if (
        body.expiredFrom !== undefined ||
        body.expiredTo !== undefined ||
        body.isActive !== undefined
      ) {
        where.expired_at = {
          ...(body.expiredFrom !== undefined && {
            gte: new Date(body.expiredFrom),
          }),
          ...(body.expiredTo !== undefined && {
            lt: new Date(body.expiredTo),
          }),
          ...(body.isActive === true && { gt: new Date() }),
          ...(body.isActive === false && { lte: new Date() }),
        };
      }
      const [rows, count] = await Promise.all([
        MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
          where,
          select: {
            id: true,
            shopping_mall_guest_id: true,
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        }),
        MyGlobal.prisma.shopping_mall_guest_sessions.count({ where }),
      ]);
      counts.push(count);
      for (const row of rows) {
        allResults.push({
          actorType: "guest",
          id: row.id,
          actorId: row.shopping_mall_guest_id,
          ip: row.ip,
          href: row.href,
          referrer: row.referrer,
          created_at: toISOStringSafe(row.created_at),
          expired_at: toISOStringSafe(row.expired_at),
        });
      }
    }
  }
  allResults.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const total = counts.reduce((sum, c) => sum + c, 0);
  const paginatedResults = allResults.slice(skip, skip + limit);
  const nowISO = toISOStringSafe(new Date());
  const data: IShoppingMallGuestSession.ISummary[] = paginatedResults.map(
    (r) => {
      const id: string & tags.Format<"uuid"> = r.id;
      const actorId: string & tags.Format<"uuid"> = r.actorId;
      const created_at: string & tags.Format<"date-time"> = r.created_at;
      const expired_at: string & tags.Format<"date-time"> = r.expired_at;
      const isActive = r.expired_at > nowISO;
      const item: IShoppingMallGuestSession.ISummary = {
        actorType: r.actorType,
        id,
        actorId,
        ip: r.ip,
        href: r.href,
        referrer: r.referrer,
        created_at,
        expired_at,
        isActive,
      };
      return item;
    },
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const result: IPageIShoppingMallGuestSession.ISummary = {
    data,
    pagination,
  };
  return result;
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
// import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
// import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerSessions(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallGuestSession.IRequest;
// }): Promise<IPageIShoppingMallGuestSession.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------