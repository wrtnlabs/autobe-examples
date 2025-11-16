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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderNumberItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderNumber: string;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });
  if (!item) {
    throw new HttpException("Order item not found", 404);
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: { deleted_at: now, updated_at: now },
  });
  // Fetch summary info for references; must split apart to ensure correct declaration ordering
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: updated.shopping_mall_product_id },
  });
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: { id: updated.shopping_mall_product_sku_id },
  });
  const orderRef = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: { id: updated.shopping_mall_order_id },
  });
  // For seller, must use product?.shopping_mall_seller_id
  const seller = product
    ? await MyGlobal.prisma.shopping_mall_sellers.findFirst({
        where: { id: product.shopping_mall_seller_id },
      })
    : null;
  const productCategories =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: updated.shopping_mall_product_id },
    });
  const categories = await Promise.all(
    productCategories.map(async (pc) => {
      return {
        id: pc.shopping_mall_category_id,
        name: "",
      };
    }),
  );
  // Compose return DTO. Only primitives and null allowed; all Date/null get toISOStringSafe, strictly handle possibly-null sub-structures
  return {
    id: updated.id,
    order: orderRef
      ? {
          id: orderRef.id,
          order_number: orderRef.order_number,
          status: orderRef.status,
          total_amount: orderRef.total_amount,
          currency: orderRef.currency,
          created_at: toISOStringSafe(orderRef.created_at),
          updated_at: toISOStringSafe(orderRef.updated_at),
          deleted_at: orderRef.deleted_at
            ? toISOStringSafe(orderRef.deleted_at)
            : null,
        }
      : {
          id: "",
          order_number: "",
          status: "",
          total_amount: 0,
          currency: "",
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
    product:
      product && seller
        ? {
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
          }
        : {
            id: "",
            title: "",
            default_price: 0,
            business_status: "",
            seller: { id: "", business_name: "" },
            categories: [],
            created_at: toISOStringSafe(new Date()),
          },
    sku:
      sku && product
        ? {
            id: sku.id,
            code: sku.sku_code,
            product_title: product.title,
            option_summary: "",
            in_stock: sku.status === "active" && sku.stock > 0,
          }
        : {
            id: "",
            code: "",
            product_title: "",
            option_summary: "",
            in_stock: false,
          },
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    subtotal: updated.subtotal,
    currency: updated.currency,
    delivered: updated.delivered,
    refunded: updated.refunded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
