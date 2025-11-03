import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import { IPageIShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderLine";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerOrdersOrderCodeLines(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingOrderLine.IRequest;
}): Promise<IPageIShoppingOrderLine.ISummary> {
  const { customer, orderCode, body } = props;

  // Find and verify order ownership and existence
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true, shopping_customer_id: true, deleted_at: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.shopping_customer_id !== customer.id) {
    throw new HttpException("Forbidden: Not your order", 403);
  }

  // Pagination parameters
  const page = typeof body.page === "number" ? body.page : 1;
  const limit = typeof body.limit === "number" ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Sort fields
  const allowedSortFields = ["unit_price", "status", "created_at"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build where clause
  const where = {
    shopping_order_id: order.id,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.seller_id !== undefined && { shopping_seller_id: body.seller_id }),
    ...(body.fulfillment_status !== undefined &&
      {
        /* fulfillment_status not present in shopping_order_lines, so ignored */
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    // sku_code requires a relation filter
    ...(body.sku_code !== undefined && {
      sku: { sku_code: body.sku_code },
    }),
  };

  // Query paginated results and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_lines.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_order_id: true,
        shopping_sku_id: true,
        shopping_seller_id: true,
        quantity: true,
        unit_price: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sku: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            is_active: true,
            status: true,
          },
        },
        seller: {
          select: {
            id: true,
            display_name: true,
            status: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_order_lines.count({ where }),
  ]);

  // Transform results
  const data = rows.map((line) => ({
    id: line.id,
    shopping_order_id: line.shopping_order_id,
    sku: {
      id: line.sku.id,
      sku_code: line.sku.sku_code,
      price: line.sku.price,
      is_active: line.sku.is_active,
      status: line.sku.status,
    },
    seller: {
      id: line.seller.id,
      display_name: line.seller.display_name,
      status: line.seller.status,
    },
    quantity: line.quantity,
    unit_price: line.unit_price,
    status: line.status,
    created_at: toISOStringSafe(line.created_at),
    updated_at: toISOStringSafe(line.updated_at),
    deleted_at:
      line.deleted_at === null ? null : toISOStringSafe(line.deleted_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
