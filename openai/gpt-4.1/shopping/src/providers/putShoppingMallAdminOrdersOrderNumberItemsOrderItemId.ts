import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminOrdersOrderNumberItemsOrderItemId(props: {
  admin: AdminPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  // 1. Find parent order
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { order_number: props.orderNumber, deleted_at: null },
  });
  if (!order) throw new HttpException("Order not found", 404);

  // 2. Find order item
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!item) throw new HttpException("Order item not found", 404);

  // 3. Update
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: item.id },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      ...(props.body.unit_price !== undefined && {
        unit_price: props.body.unit_price,
      }),
      ...(props.body.delivered !== undefined && {
        delivered: props.body.delivered,
      }),
      ...(props.body.refunded !== undefined && {
        refunded: props.body.refunded,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Get product (no include!), then seller separately
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: updated.shopping_mall_product_id },
  });
  if (!product) throw new HttpException("Product not found", 500);
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
  });
  if (!seller) throw new HttpException("Seller not found", 500);

  // 5. SKU
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: updated.shopping_mall_product_sku_id },
  });
  if (!sku) throw new HttpException("SKU not found", 500);

  // 6. Category summaries
  const categoriesMappings =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: product.id },
    });
  const categoryIds = categoriesMappings.map(
    (m) => m.shopping_mall_category_id,
  );
  let categories: IShoppingMallProductsCategory.ISummary[] = [];
  if (categoryIds.length > 0) {
    const cats = await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
    });
    categories = cats.map((cat) => ({ id: cat.id, name: cat.name }));
  }

  // 7. DTO response
  return {
    id: updated.id,
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency,
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at:
        order.deleted_at !== null && order.deleted_at !== undefined
          ? toISOStringSafe(order.deleted_at)
          : null,
    },
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: {
        id: seller.id,
        business_name: seller.business_name,
      },
      categories,
      created_at: toISOStringSafe(product.created_at),
    },
    sku: {
      id: sku.id,
      code: sku.sku_code,
      product_title: product.title,
      option_summary: "",
      in_stock: sku.status === "active" && sku.stock > 0,
    },
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    subtotal: updated.subtotal,
    currency: updated.currency,
    delivered: updated.delivered,
    refunded: updated.refunded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
