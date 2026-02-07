import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
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
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const { page = 1, limit = 100 } = props.body as any;
  const offset = (page - 1) * limit;
  // Extract filter parameters
  const {
    actorType,
    createdAtStart,
    createdAtEnd,
    expiredAtStart,
    expiredAtEnd,
    isActive,
    ip,
  } = props.body as any;
  // Construct SQL UNION query for all session types
  const sql = `
    SELECT 
      id, 
      'admin' as actor_type, 
      admin_id as actor_id, 
      created_at::text as created_at, 
      expired_at::text as expired_at, 
      true as is_active, 
      ip, 
      href, 
      referrer
    FROM shopping_mall_admin_sessions
    WHERE ($1 IS NULL OR 'admin' = $1)
      AND ($2 IS NULL OR created_at >= $2::timestamp)
      AND ($3 IS NULL OR created_at <= $3::timestamp)
      AND ($4 IS NULL OR expired_at >= $4::timestamp)
      AND ($5 IS NULL OR expired_at <= $5::timestamp)
      AND ($7 IS NULL OR ip = $7)

    UNION ALL

    SELECT 
      id, 
      'customer' as actor_type, 
      shopping_mall_customer_id as actor_id, 
      created_at::text as created_at, 
      expired_at::text as expired_at, 
      is_active, 
      ip, 
      href, 
      referrer
    FROM shopping_mall_customer_sessions
    WHERE ($1 IS NULL OR 'customer' = $1)
      AND ($2 IS NULL OR created_at >= $2::timestamp)
      AND ($3 IS NULL OR created_at <= $3::timestamp)
      AND ($4 IS NULL OR expired_at >= $4::timestamp)
      AND ($5 IS NULL OR expired_at <= $5::timestamp)
      AND ($6 IS NULL OR is_active = $6)
      AND ($7 IS NULL OR ip = $7)

    UNION ALL

    SELECT 
      id, 
      'seller' as actor_type, 
      shopping_mall_seller_id as actor_id, 
      created_at::text as created_at, 
      expired_at::text as expired_at, 
      true as is_active, 
      ip, 
      href, 
      referrer
    FROM shopping_mall_seller_sessions
    WHERE ($1 IS NULL OR 'seller' = $1)
      AND ($2 IS NULL OR created_at >= $2::timestamp)
      AND ($3 IS NULL OR created_at <= $3::timestamp)
      AND ($4 IS NULL OR expired_at >= $4::timestamp)
      AND ($5 IS NULL OR expired_at <= $5::timestamp)
      AND ($7 IS NULL OR ip = $7)

    ORDER BY created_at DESC
    OFFSET $8
    LIMIT $9
  `;
  // Execute query with parameters
  const results: any[] = await MyGlobal.prisma.$queryRawUnsafe(
    sql,
    actorType,
    createdAtStart,
    createdAtEnd,
    expiredAtStart,
    expiredAtEnd,
    isActive,
    ip,
    offset,
    limit,
  );
  // Count total records for pagination
  const countSql = `
    SELECT COUNT(*) as total FROM (
      SELECT id FROM shopping_mall_admin_sessions
      WHERE ($1 IS NULL OR 'admin' = $1)
        AND ($2 IS NULL OR created_at >= $2::timestamp)
        AND ($3 IS NULL OR created_at <= $3::timestamp)
        AND ($4 IS NULL OR expired_at >= $4::timestamp)
        AND ($5 IS NULL OR expired_at <= $5::timestamp)
        AND ($7 IS NULL OR ip = $7)

      UNION ALL

      SELECT id FROM shopping_mall_customer_sessions
      WHERE ($1 IS NULL OR 'customer' = $1)
        AND ($2 IS NULL OR created_at >= $2::timestamp)
        AND ($3 IS NULL OR created_at <= $3::timestamp)
        AND ($4 IS NULL OR expired_at >= $4::timestamp)
        AND ($5 IS NULL OR expired_at <= $5::timestamp)
        AND ($6 IS NULL OR is_active = $6)
        AND ($7 IS NULL OR ip = $7)

      UNION ALL

      SELECT id FROM shopping_mall_seller_sessions
      WHERE ($1 IS NULL OR 'seller' = $1)
        AND ($2 IS NULL OR created_at >= $2::timestamp)
        AND ($3 IS NULL OR created_at <= $3::timestamp)
        AND ($4 IS NULL OR expired_at >= $4::timestamp)
        AND ($5 IS NULL OR expired_at <= $5::timestamp)
        AND ($7 IS NULL OR ip = $7)
    ) AS combined`;
  const countResult: any[] = await MyGlobal.prisma.$queryRawUnsafe(
    countSql,
    actorType,
    createdAtStart,
    createdAtEnd,
    expiredAtStart,
    expiredAtEnd,
    isActive,
    ip,
  );
  const total = countResult[0]?.total
    ? parseInt(countResult[0].total as string, 10)
    : 0;
  // Map results to IPageIShoppingMallAdminSession.ISummary format
  const data = results.map((row: any) => ({
    id: row.id as string & tags.Format<"uuid">,
    actor_type: row.actor_type as "admin" | "customer" | "seller",
    actor_id: row.actor_id as string & tags.Format<"uuid">,
    created_at: row.created_at as string & tags.Format<"date-time">,
    expired_at: row.expired_at as string & tags.Format<"date-time">,
    is_active: row.is_active as boolean,
    ip: row.ip as string,
    href: row.href as string,
    referrer: row.referrer as string | null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
