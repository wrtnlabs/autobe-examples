import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: order.shopping_mall_buyer_id },
  });

  const deliveryAddress =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: order.shopping_mall_buyer_address_id },
    });

  const orderSellers =
    await MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });

  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });

  const sellers = await Promise.all(
    orderSellers.map(async (orderSeller) => {
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: orderSeller.shopping_mall_seller_id },
      });

      const sellerItems =
        await MyGlobal.prisma.shopping_mall_order_items.findMany({
          where: {
            shopping_mall_order_seller_id: orderSeller.id,
            deleted_at: null,
          },
        });

      const sellerOrderItems = await Promise.all(
        sellerItems.map(async (item) => {
          const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
            where: { id: item.shopping_mall_sale_sku_id },
          });

          const sale = sku
            ? await MyGlobal.prisma.shopping_mall_sales.findUnique({
                where: { id: sku.shopping_mall_sale_id },
              })
            : null;

          const saleCategory = sale
            ? await MyGlobal.prisma.shopping_mall_categories.findUnique({
                where: { id: sale.shopping_mall_category_id },
              })
            : null;

          const saleSeller = sale
            ? await MyGlobal.prisma.shopping_mall_sellers.findUnique({
                where: { id: sale.shopping_mall_seller_id },
              })
            : null;

          const saleImages = sale
            ? await MyGlobal.prisma.shopping_mall_sale_images.findMany({
                where: { shopping_mall_sale_id: sale.id },
                orderBy: { display_order: "asc" },
                take: 1,
              })
            : [];

          const allSkus = sale
            ? await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
                where: {
                  shopping_mall_sale_id: sale.id,
                  enabled: true,
                },
              })
            : [];

          const minPrice =
            allSkus.length > 0
              ? Math.min(...allSkus.map((s) => s.sale_price ?? s.base_price))
              : (sku?.base_price ?? 0);

          const thumbnailUrl = saleImages[0]?.url_thumbnail ?? undefined;

          return {
            id: item.id,
            shopping_mall_order_id: item.shopping_mall_order_id,
            shopping_mall_order_seller_id: item.shopping_mall_order_seller_id,
            shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
            saleSku: {
              id: sku!.id,
              sku_code: sku!.sku_code,
              variant_combination: sku!.variant_combination,
              base_price: sku!.base_price,
              price: sku!.sale_price ?? sku!.base_price,
              enabled: sku!.enabled,
              sale: {
                id: sale!.id,
                code: sale!.code,
                title: sale!.title,
                status: typia.assert<
                  | "draft"
                  | "pending_approval"
                  | "published"
                  | "suspended"
                  | "archived"
                >(sale!.status),
                condition: typia.assert<"new" | "refurbished" | "used">(
                  sale!.condition,
                ),
                brand: sale!.brand ?? undefined,
                short_description: sale!.short_description ?? undefined,
                price: minPrice,
                thumbnail_url: thumbnailUrl,
                return_policy_days: sale!.return_policy_days,
                warranty_info: sale!.warranty_info ?? undefined,
                created_at: toISOStringSafe(sale!.created_at),
                updated_at: toISOStringSafe(sale!.updated_at),
                deleted_at: sale!.deleted_at
                  ? toISOStringSafe(sale!.deleted_at)
                  : null,
                seller: {
                  id: saleSeller!.id,
                  store_name: saleSeller!.store_name,
                  email: saleSeller!.email,
                  status: typia.assert<
                    "pending" | "approved" | "rejected" | "suspended"
                  >(saleSeller!.status),
                  email_verified: saleSeller!.email_verified,
                },
                category: {
                  id: saleCategory!.id,
                  name: saleCategory!.name,
                  slug: saleCategory!.slug,
                  description: saleCategory!.description ?? undefined,
                  image_url: saleCategory!.image_url ?? undefined,
                  parent_id: saleCategory!.parent_id ?? undefined,
                  status: saleCategory!.status,
                  display_order: saleCategory!.display_order,
                  product_count: saleCategory!.product_count,
                  created_at: toISOStringSafe(saleCategory!.created_at),
                  updated_at: toISOStringSafe(saleCategory!.updated_at),
                },
              },
            },
            product_name: item.product_name,
            sku_code: item.sku_code,
            variant_attributes: item.variant_attributes ?? undefined,
            unit_price: item.unit_price,
            quantity: item.quantity,
            line_total: item.line_total,
            discount_amount: item.discount_amount,
            created_at: toISOStringSafe(item.created_at),
            updated_at: toISOStringSafe(item.updated_at),
            deleted_at: item.deleted_at
              ? toISOStringSafe(item.deleted_at)
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
          id: seller!.id,
          store_name: seller!.store_name,
          email: seller!.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller!.status),
          email_verified: seller!.email_verified,
        },
        subtotal: orderSeller.subtotal,
        shipping_cost: orderSeller.shipping_cost,
        shipping_method: orderSeller.shipping_method,
        tracking_number: orderSeller.tracking_number ?? undefined,
        carrier_name: orderSeller.carrier_name ?? undefined,
        shipped_at: orderSeller.shipped_at
          ? toISOStringSafe(orderSeller.shipped_at)
          : null,
        delivered_at: orderSeller.delivered_at
          ? toISOStringSafe(orderSeller.delivered_at)
          : null,
        items: sellerOrderItems,
        created_at: toISOStringSafe(orderSeller.created_at),
        updated_at: toISOStringSafe(orderSeller.updated_at),
        deleted_at: orderSeller.deleted_at
          ? toISOStringSafe(orderSeller.deleted_at)
          : null,
      };
    }),
  );

  const items = await Promise.all(
    orderItems.map(async (item) => {
      const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: item.shopping_mall_sale_sku_id },
      });

      const sale = sku
        ? await MyGlobal.prisma.shopping_mall_sales.findUnique({
            where: { id: sku.shopping_mall_sale_id },
          })
        : null;

      const saleCategory = sale
        ? await MyGlobal.prisma.shopping_mall_categories.findUnique({
            where: { id: sale.shopping_mall_category_id },
          })
        : null;

      const saleSeller = sale
        ? await MyGlobal.prisma.shopping_mall_sellers.findUnique({
            where: { id: sale.shopping_mall_seller_id },
          })
        : null;

      const saleImages = sale
        ? await MyGlobal.prisma.shopping_mall_sale_images.findMany({
            where: { shopping_mall_sale_id: sale.id },
            orderBy: { display_order: "asc" },
            take: 1,
          })
        : [];

      const allSkus = sale
        ? await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
            where: {
              shopping_mall_sale_id: sale.id,
              enabled: true,
            },
          })
        : [];

      const minPrice =
        allSkus.length > 0
          ? Math.min(...allSkus.map((s) => s.sale_price ?? s.base_price))
          : (sku?.base_price ?? 0);

      const thumbnailUrl = saleImages[0]?.url_thumbnail ?? undefined;

      return {
        id: item.id,
        shopping_mall_order_id: item.shopping_mall_order_id,
        shopping_mall_order_seller_id: item.shopping_mall_order_seller_id,
        shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
        saleSku: {
          id: sku!.id,
          sku_code: sku!.sku_code,
          variant_combination: sku!.variant_combination,
          base_price: sku!.base_price,
          price: sku!.sale_price ?? sku!.base_price,
          enabled: sku!.enabled,
          sale: {
            id: sale!.id,
            code: sale!.code,
            title: sale!.title,
            status: typia.assert<
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived"
            >(sale!.status),
            condition: typia.assert<"new" | "refurbished" | "used">(
              sale!.condition,
            ),
            brand: sale!.brand ?? undefined,
            short_description: sale!.short_description ?? undefined,
            price: minPrice,
            thumbnail_url: thumbnailUrl,
            return_policy_days: sale!.return_policy_days,
            warranty_info: sale!.warranty_info ?? undefined,
            created_at: toISOStringSafe(sale!.created_at),
            updated_at: toISOStringSafe(sale!.updated_at),
            deleted_at: sale!.deleted_at
              ? toISOStringSafe(sale!.deleted_at)
              : null,
            seller: {
              id: saleSeller!.id,
              store_name: saleSeller!.store_name,
              email: saleSeller!.email,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(saleSeller!.status),
              email_verified: saleSeller!.email_verified,
            },
            category: {
              id: saleCategory!.id,
              name: saleCategory!.name,
              slug: saleCategory!.slug,
              description: saleCategory!.description ?? undefined,
              image_url: saleCategory!.image_url ?? undefined,
              parent_id: saleCategory!.parent_id ?? undefined,
              status: saleCategory!.status,
              display_order: saleCategory!.display_order,
              product_count: saleCategory!.product_count,
              created_at: toISOStringSafe(saleCategory!.created_at),
              updated_at: toISOStringSafe(saleCategory!.updated_at),
            },
          },
        },
        product_name: item.product_name,
        sku_code: item.sku_code,
        variant_attributes: item.variant_attributes ?? undefined,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        discount_amount: item.discount_amount,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      };
    }),
  );

  return {
    id: order.id,
    shopping_mall_buyer_id: order.shopping_mall_buyer_id,
    shopping_mall_buyer_address_id: order.shopping_mall_buyer_address_id,
    order_number: order.order_number,
    status: order.status,
    buyer: {
      id: buyer!.id,
      email: buyer!.email,
      full_name: buyer!.full_name,
      phone_number: buyer!.phone_number ?? undefined,
    },
    deliveryAddress: {
      id: deliveryAddress!.id,
      recipient_name: deliveryAddress!.recipient_name,
      street_address_line1: deliveryAddress!.street_address_line1,
      city: deliveryAddress!.city,
      state: deliveryAddress!.state,
      postal_code: deliveryAddress!.postal_code,
      country: deliveryAddress!.country,
      address_label: deliveryAddress!.address_label,
    },
    subtotal: order.subtotal,
    shipping_total: order.shipping_total,
    tax_total: order.tax_total,
    discount_total: order.discount_total,
    total_amount: order.total_amount,
    estimated_delivery_start: order.estimated_delivery_start
      ? toISOStringSafe(order.estimated_delivery_start)
      : null,
    estimated_delivery_end: order.estimated_delivery_end
      ? toISOStringSafe(order.estimated_delivery_end)
      : null,
    actual_delivery_at: order.actual_delivery_at
      ? toISOStringSafe(order.actual_delivery_at)
      : null,
    cancelled_at: order.cancelled_at
      ? toISOStringSafe(order.cancelled_at)
      : null,
    completed_at: order.completed_at
      ? toISOStringSafe(order.completed_at)
      : null,
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    sellers,
    items,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
  };
}
