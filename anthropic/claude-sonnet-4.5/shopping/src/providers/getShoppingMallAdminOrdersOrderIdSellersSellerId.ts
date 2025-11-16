import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdSellersSellerId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.sellerId },
  });

  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }

  const orderSeller =
    await MyGlobal.prisma.shopping_mall_order_sellers.findFirst({
      where: {
        id: props.sellerId,
        shopping_mall_order_id: props.orderId,
      },
    });

  if (!orderSeller) {
    throw new HttpException(
      "Seller segment not found or does not belong to the specified order",
      404,
    );
  }

  const items = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_seller_id: orderSeller.id,
      deleted_at: null,
    },
  });

  const itemsWithDetails = await Promise.all(
    items.map(async (item) => {
      const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: item.shopping_mall_sale_sku_id },
      });

      if (!sku) {
        throw new HttpException("SKU not found", 404);
      }

      const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
        where: { id: sku.shopping_mall_sale_id },
      });

      if (!sale) {
        throw new HttpException("Sale not found", 404);
      }

      const saleseller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
        {
          where: { id: sale.shopping_mall_seller_id },
        },
      );

      if (!saleseller) {
        throw new HttpException("Sale seller not found", 404);
      }

      const category =
        await MyGlobal.prisma.shopping_mall_categories.findUnique({
          where: { id: sale.shopping_mall_category_id },
        });

      if (!category) {
        throw new HttpException("Category not found", 404);
      }

      return {
        id: item.id,
        shopping_mall_order_id: item.shopping_mall_order_id,
        shopping_mall_order_seller_id: item.shopping_mall_order_seller_id,
        shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
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
            status: sale.status as
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived",
            condition: sale.condition as "new" | "refurbished" | "used",
            brand: sale.brand === null ? undefined : sale.brand,
            short_description:
              sale.short_description === null
                ? undefined
                : sale.short_description,
            price: sku.base_price,
            thumbnail_url: undefined,
            return_policy_days: sale.return_policy_days,
            warranty_info:
              sale.warranty_info === null ? undefined : sale.warranty_info,
            created_at: toISOStringSafe(sale.created_at),
            updated_at: toISOStringSafe(sale.updated_at),
            deleted_at: sale.deleted_at
              ? toISOStringSafe(sale.deleted_at)
              : sale.deleted_at === null
                ? undefined
                : null,
            seller: {
              id: saleseller.id,
              store_name: saleseller.store_name,
              email: saleseller.email,
              status: saleseller.status as
                | "pending"
                | "approved"
                | "rejected"
                | "suspended",
              email_verified: saleseller.email_verified,
            },
            category: {
              id: category.id,
              name: category.name,
              slug: category.slug,
              description:
                category.description === null
                  ? undefined
                  : category.description,
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
        product_name: item.product_name,
        sku_code: item.sku_code,
        variant_attributes:
          item.variant_attributes === null
            ? undefined
            : item.variant_attributes,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        discount_amount: item.discount_amount,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at
          ? toISOStringSafe(item.deleted_at)
          : item.deleted_at === null
            ? undefined
            : null,
      };
    }),
  );

  return {
    id: orderSeller.id,
    shopping_mall_order_id: orderSeller.shopping_mall_order_id,
    shopping_mall_seller_id: orderSeller.shopping_mall_seller_id,
    sub_order_number: orderSeller.sub_order_number,
    status: orderSeller.status,
    seller: {
      id: seller.id,
      store_name: seller.store_name,
      email: seller.email,
      status: seller.status as
        | "pending"
        | "approved"
        | "rejected"
        | "suspended",
      email_verified: seller.email_verified,
    },
    subtotal: orderSeller.subtotal,
    shipping_cost: orderSeller.shipping_cost,
    shipping_method: orderSeller.shipping_method,
    tracking_number:
      orderSeller.tracking_number === null
        ? undefined
        : orderSeller.tracking_number,
    carrier_name:
      orderSeller.carrier_name === null ? undefined : orderSeller.carrier_name,
    shipped_at: orderSeller.shipped_at
      ? toISOStringSafe(orderSeller.shipped_at)
      : orderSeller.shipped_at === null
        ? undefined
        : null,
    delivered_at: orderSeller.delivered_at
      ? toISOStringSafe(orderSeller.delivered_at)
      : orderSeller.delivered_at === null
        ? undefined
        : null,
    items: itemsWithDetails,
    created_at: toISOStringSafe(orderSeller.created_at),
    updated_at: toISOStringSafe(orderSeller.updated_at),
    deleted_at: orderSeller.deleted_at
      ? toISOStringSafe(orderSeller.deleted_at)
      : orderSeller.deleted_at === null
        ? undefined
        : null,
  };
}
