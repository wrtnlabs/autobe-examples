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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminOrdersOrderCodeLines(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrderLine.IRequest;
}): Promise<IPageIShoppingOrderLine.ISummary> {
  const { orderCode, body } = props;

  // 1. Lookup order by order_code.
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Build where clause for shopping_order_lines
  const whereClause: Record<string, any> = {
    shopping_order_id: order.id,
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
  };

  // 3. Optional: filter by SKU code (need to resolve SKU id)
  if (body.sku_code) {
    const sku = await MyGlobal.prisma.shopping_skus.findUnique({
      where: { sku_code: body.sku_code },
      select: { id: true },
    });
    if (!sku)
      return {
        pagination: {
          current: Number(body.page),
          limit: Number(body.limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    whereClause.shopping_sku_id = sku.id;
  }

  // 4. Optional: filter by seller_id
  if (body.seller_id) {
    whereClause.shopping_seller_id = body.seller_id;
  }

  // 5. Optional: filter by created_at range
  if (body.created_from || body.created_to) {
    whereClause.created_at = {};
    if (body.created_from) whereClause.created_at.gte = body.created_from;
    if (body.created_to) whereClause.created_at.lte = body.created_to;
  }

  // 6. Optional: fulfillment_status filter (join fulfillment subquery)
  if (body.fulfillment_status) {
    const fLines = await MyGlobal.prisma.shopping_order_fulfillments.findMany({
      where: { status: body.fulfillment_status },
      select: { shopping_order_line_id: true },
    });
    const fLineIds = fLines.map((f) => f.shopping_order_line_id);
    if (!fLineIds.length) {
      return {
        pagination: {
          current: Number(body.page),
          limit: Number(body.limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
    whereClause.id = { in: fLineIds };
  }

  // 7. Pagination, sorting
  const skip = (Number(body.page) - 1) * Number(body.limit);
  const take = Number(body.limit);
  let orderBy: Record<string, any> = { created_at: "desc" };
  if (body.sort_by) {
    orderBy = { [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc" };
  }

  // 8. Retrieve paginated lines + total
  const [lines, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_lines.findMany({
      where: whereClause,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.shopping_order_lines.count({ where: whereClause }),
  ]);

  // 9. Gather SKU + seller summaries
  const skuIds = Array.from(new Set(lines.map((line) => line.shopping_sku_id)));
  const sellerIds = Array.from(
    new Set(lines.map((line) => line.shopping_seller_id)),
  );
  const [skus, sellers] = await Promise.all([
    MyGlobal.prisma.shopping_skus.findMany({
      where: { id: { in: skuIds } },
      select: {
        id: true,
        sku_code: true,
        price: true,
        is_active: true,
        status: true,
      },
    }),
    MyGlobal.prisma.shopping_sellers.findMany({
      where: { id: { in: sellerIds } },
      select: {
        id: true,
        display_name: true,
        status: true,
      },
    }),
  ]);
  const skuMap = Object.fromEntries(skus.map((sku) => [sku.id, sku]));
  const sellerMap = Object.fromEntries(
    sellers.map((seller) => [seller.id, seller]),
  );

  // 10. Transform lines to IShoppingOrderLine.ISummary
  const data = lines.map((line) => {
    const sku = skuMap[line.shopping_sku_id];
    const seller = sellerMap[line.shopping_seller_id];
    return {
      id: line.id,
      shopping_order_id: line.shopping_order_id,
      sku: {
        id: sku.id,
        sku_code: sku.sku_code,
        price: sku.price,
        is_active: sku.is_active,
        status: sku.status,
      },
      seller: {
        id: seller.id,
        display_name: seller.display_name,
        status: seller.status,
      },
      quantity: line.quantity,
      unit_price: line.unit_price,
      status: line.status,
      created_at: toISOStringSafe(line.created_at),
      updated_at: toISOStringSafe(line.updated_at),
      deleted_at: line.deleted_at ? toISOStringSafe(line.deleted_at) : null,
    };
  });

  return {
    pagination: {
      current: Number(body.page),
      limit: Number(body.limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / Number(body.limit)),
    },
    data,
  };
}
