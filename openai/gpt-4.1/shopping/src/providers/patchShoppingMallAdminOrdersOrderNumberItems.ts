import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberItems(props: {
  admin: AdminPayload;
  orderNumber: string;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  // 1. Find the order by orderNumber and ensure not soft deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!order) {
    return {
      pagination: {
        current: props.body.page,
        limit: props.body.limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // 2. Build filters for order items
  const filters: Record<string, any> = {
    shopping_mall_order_id: order.id,
    deleted_at: null,
  };
  if (props.body.sku_id !== undefined)
    filters.shopping_mall_product_sku_id = props.body.sku_id;
  if (props.body.delivered !== undefined)
    filters.delivered = props.body.delivered;
  if (props.body.refunded !== undefined) filters.refunded = props.body.refunded;
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    filters.unit_price = {};
    if (props.body.min_price !== undefined)
      filters.unit_price.gte = props.body.min_price;
    if (props.body.max_price !== undefined)
      filters.unit_price.lte = props.body.max_price;
  }

  const skip = (props.body.page - 1) * props.body.limit;
  const take = props.body.limit;

  // 3. Query paginated data and total count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: filters,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        sku: {
          select: {
            id: true,
            sku_code: true,
            status: true,
            shopping_mall_product_id: true,
            stock: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where: filters }),
  ]);

  // Find all unique product ids from the sku records
  const productIds = Array.from(
    new Set(
      items.map((item) => item.sku?.shopping_mall_product_id).filter(Boolean),
    ),
  );

  // Batch fetch all product titles
  const productMap =
    productIds.length > 0
      ? Object.fromEntries(
          (
            await MyGlobal.prisma.shopping_mall_products.findMany({
              where: { id: { in: productIds } },
              select: { id: true, title: true },
            })
          ).map((prod) => [prod.id, prod.title]),
        )
      : {};

  const data: IShoppingMallOrderItem.ISummary[] = items.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    sku: {
      id: item.sku.id,
      code: item.sku.sku_code,
      product_title: productMap[item.sku.shopping_mall_product_id] ?? "",
      option_summary: "", // See above, not loaded
      in_stock: item.sku.stock > 0 && item.sku.status === "active",
    },
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    currency: item.currency,
    delivered: item.delivered,
    refunded: item.refunded,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: props.body.page,
      limit: props.body.limit,
      records: total,
      pages: Math.ceil(total / props.body.limit),
    },
    data,
  };
}
