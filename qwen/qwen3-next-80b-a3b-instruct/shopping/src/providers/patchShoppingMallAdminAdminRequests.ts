import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAction";
import { IShoppingMallAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAction";
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

export async function patchShoppingMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAction.IRequest;
}): Promise<IPageIShoppingMallAdminAction.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  // Since IRequest is empty, we ignore all filtering and retrieve all records
  const unionSql = `
    SELECT
      'cancellation' AS request_type,
      c.id,
      c.status,
      c.created_at,
      cu.email,
      cu.display_name,
      c.reason,
      c.order_item_id AS entity_reference,
      c.customer_id
    FROM shopping_mall_cancellation_requests c
    JOIN shopping_mall_customers cu ON c.customer_id = cu.id
    WHERE c.deleted_at IS NULL

    UNION ALL

    SELECT
      'refund' AS request_type,
      r.id,
      r.status,
      r.created_at,
      cu.email,
      cu.display_name,
      r.reason,
      r.shopping_mall_order_item_id AS entity_reference,
      r.shopping_mall_customer_id AS customer_id
    FROM shopping_mall_refund_requests r
    JOIN shopping_mall_customers cu ON r.shopping_mall_customer_id = cu.id
    WHERE r.deleted_at IS NULL

    ORDER BY created_at DESC
    LIMIT $1
    OFFSET $2
  `;
  const results = await MyGlobal.prisma.$queryRawUnsafe<
    {
      request_type: "cancellation" | "refund";
      id: string;
      status: string;
      created_at: Date;
      email: string;
      display_name: string | null;
      reason: string;
      entity_reference: string;
      customer_id: string;
    }[]
  >(unionSql, limit, skip);
  const unified = results.map((r) => ({
    request_type: r.request_type,
    request_id: r.id,
    status: r.status,
    created_at: toISOStringSafe(r.created_at) as string &
      tags.Format<"date-time">,
    customer_id: r.customer_id,
    customer_display_name: r.display_name ?? "",
    customer_email: r.email,
    reason_preview:
      r.reason.length > 100 ? r.reason.substring(0, 100) + "..." : r.reason,
    entity_reference: r.entity_reference,
  }));
  const countSql = `
    SELECT COUNT(*) FROM (
      SELECT 1 FROM shopping_mall_cancellation_requests c
      JOIN shopping_mall_customers cu ON c.customer_id = cu.id
      WHERE c.deleted_at IS NULL

      UNION ALL

      SELECT 1 FROM shopping_mall_refund_requests r
      JOIN shopping_mall_customers cu ON r.shopping_mall_customer_id = cu.id
      WHERE r.deleted_at IS NULL
    ) AS unioned
  `;
  const [{ count }] = await MyGlobal.prisma.$queryRawUnsafe<
    {
      count: bigint;
    }[]
  >(countSql);
  const total = Number(count);
  return {
    data: unified,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
