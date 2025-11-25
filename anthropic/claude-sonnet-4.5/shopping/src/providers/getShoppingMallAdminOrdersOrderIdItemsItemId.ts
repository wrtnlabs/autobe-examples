import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdItemsItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      id: props.itemId,
    },
    include: {
      saleSku: {
        include: {
          sale: {
            include: {
              seller: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }

  const sku = orderItem.saleSku;
  const sale = sku.sale;
  const seller = sale.seller;
  const category = sale.category;

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_order_seller_id: orderItem.shopping_mall_order_seller_id,
    shopping_mall_sale_sku_id: orderItem.shopping_mall_sale_sku_id,
    saleSku: {
      id: sku.id,
      sku_code: sku.sku_code,
      variant_combination: sku.variant_combination,
      base_price: sku.base_price,
      price: sku.sale_price ?? sku.base_price,
      enabled: sku.enabled,
      sale: {
        id: sale.id,
        code: sale.code,
        title: sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(sale.condition),
        brand: sale.brand === null ? undefined : sale.brand,
        short_description:
          sale.short_description === null ? undefined : sale.short_description,
        price: sku.base_price,
        thumbnail_url: undefined,
        return_policy_days: sale.return_policy_days,
        warranty_info:
          sale.warranty_info === null ? undefined : sale.warranty_info,
        created_at: toISOStringSafe(sale.created_at),
        updated_at: toISOStringSafe(sale.updated_at),
        deleted_at:
          sale.deleted_at === null
            ? undefined
            : toISOStringSafe(sale.deleted_at),
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller.status),
          email_verified: seller.email_verified,
        },
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description:
            category.description === null ? undefined : category.description,
          image_url:
            category.image_url === null ? undefined : category.image_url,
          parent_id:
            category.parent_id === null ? undefined : category.parent_id,
          status: category.status,
          display_order: category.display_order,
          product_count: category.product_count,
          created_at: toISOStringSafe(category.created_at),
          updated_at: toISOStringSafe(category.updated_at),
        },
      },
    },
    product_name: orderItem.product_name,
    sku_code: orderItem.sku_code,
    variant_attributes:
      orderItem.variant_attributes === null
        ? undefined
        : orderItem.variant_attributes,
    unit_price: orderItem.unit_price,
    quantity: orderItem.quantity,
    line_total: orderItem.line_total,
    discount_amount: orderItem.discount_amount,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at:
      orderItem.deleted_at === null
        ? undefined
        : toISOStringSafe(orderItem.deleted_at),
  };
}
