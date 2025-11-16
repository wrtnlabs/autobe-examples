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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: order.shopping_mall_buyer_id },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const buyerAddress =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: order.shopping_mall_buyer_address_id },
    });

  if (!buyerAddress) {
    throw new HttpException("Buyer address not found", 404);
  }

  const orderSellers =
    await MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: { shopping_mall_order_id: order.id },
    });

  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: { shopping_mall_order_id: order.id },
  });

  const sellers = await Promise.all(
    orderSellers.map(async (orderSeller) => {
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: orderSeller.shopping_mall_seller_id },
      });

      if (!seller) {
        throw new HttpException("Seller not found", 404);
      }

      const sellerItems = orderItems.filter(
        (item) => item.shopping_mall_order_seller_id === orderSeller.id,
      );

      const items = await Promise.all(
        sellerItems.map(async (item) => {
          const saleSku =
            await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
              where: { id: item.shopping_mall_sale_sku_id },
            });

          if (!saleSku) {
            throw new HttpException("Sale SKU not found", 404);
          }

          const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
            where: { id: saleSku.shopping_mall_sale_id },
          });

          if (!sale) {
            throw new HttpException("Sale not found", 404);
          }

          const saleSeller =
            await MyGlobal.prisma.shopping_mall_sellers.findUnique({
              where: { id: sale.shopping_mall_seller_id },
            });

          if (!saleSeller) {
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
              id: saleSku.id,
              sku_code: saleSku.sku_code,
              variant_combination: saleSku.variant_combination,
              base_price: saleSku.base_price,
              price: saleSku.sale_price ?? saleSku.base_price,
              enabled: saleSku.enabled,
              sale: {
                id: sale.id,
                code: sale.code,
                title: sale.title,
                status: typia.assert<
                  | "draft"
                  | "pending_approval"
                  | "published"
                  | "suspended"
                  | "archived"
                >(sale.status),
                condition: typia.assert<"new" | "refurbished" | "used">(
                  sale.condition,
                ),
                brand: sale.brand ?? undefined,
                short_description: sale.short_description ?? undefined,
                price: saleSku.base_price,
                thumbnail_url: undefined,
                return_policy_days: sale.return_policy_days,
                warranty_info: sale.warranty_info ?? undefined,
                created_at: toISOStringSafe(sale.created_at),
                updated_at: toISOStringSafe(sale.updated_at),
                deleted_at: sale.deleted_at
                  ? toISOStringSafe(sale.deleted_at)
                  : undefined,
                seller: {
                  id: saleSeller.id,
                  store_name: saleSeller.store_name,
                  email: saleSeller.email,
                  status: typia.assert<
                    "pending" | "approved" | "rejected" | "suspended"
                  >(saleSeller.status),
                  email_verified: saleSeller.email_verified,
                },
                category: {
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                  description: category.description ?? undefined,
                  image_url: category.image_url ?? undefined,
                  parent_id: category.parent_id ?? undefined,
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
            variant_attributes: item.variant_attributes ?? undefined,
            unit_price: item.unit_price,
            quantity: item.quantity,
            line_total: item.line_total,
            discount_amount: item.discount_amount,
            created_at: toISOStringSafe(item.created_at),
            updated_at: toISOStringSafe(item.updated_at),
            deleted_at: item.deleted_at
              ? toISOStringSafe(item.deleted_at)
              : undefined,
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
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(seller.status),
          email_verified: seller.email_verified,
        },
        subtotal: orderSeller.subtotal,
        shipping_cost: orderSeller.shipping_cost,
        shipping_method: orderSeller.shipping_method,
        tracking_number: orderSeller.tracking_number ?? undefined,
        carrier_name: orderSeller.carrier_name ?? undefined,
        shipped_at: orderSeller.shipped_at
          ? toISOStringSafe(orderSeller.shipped_at)
          : undefined,
        delivered_at: orderSeller.delivered_at
          ? toISOStringSafe(orderSeller.delivered_at)
          : undefined,
        items,
        created_at: toISOStringSafe(orderSeller.created_at),
        updated_at: toISOStringSafe(orderSeller.updated_at),
        deleted_at: orderSeller.deleted_at
          ? toISOStringSafe(orderSeller.deleted_at)
          : undefined,
      };
    }),
  );

  const items = await Promise.all(
    orderItems.map(async (item) => {
      const saleSku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: item.shopping_mall_sale_sku_id },
      });

      if (!saleSku) {
        throw new HttpException("Sale SKU not found", 404);
      }

      const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
        where: { id: saleSku.shopping_mall_sale_id },
      });

      if (!sale) {
        throw new HttpException("Sale not found", 404);
      }

      const saleSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
        {
          where: { id: sale.shopping_mall_seller_id },
        },
      );

      if (!saleSeller) {
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
          id: saleSku.id,
          sku_code: saleSku.sku_code,
          variant_combination: saleSku.variant_combination,
          base_price: saleSku.base_price,
          price: saleSku.sale_price ?? saleSku.base_price,
          enabled: saleSku.enabled,
          sale: {
            id: sale.id,
            code: sale.code,
            title: sale.title,
            status: typia.assert<
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived"
            >(sale.status),
            condition: typia.assert<"new" | "refurbished" | "used">(
              sale.condition,
            ),
            brand: sale.brand ?? undefined,
            short_description: sale.short_description ?? undefined,
            price: saleSku.base_price,
            thumbnail_url: undefined,
            return_policy_days: sale.return_policy_days,
            warranty_info: sale.warranty_info ?? undefined,
            created_at: toISOStringSafe(sale.created_at),
            updated_at: toISOStringSafe(sale.updated_at),
            deleted_at: sale.deleted_at
              ? toISOStringSafe(sale.deleted_at)
              : undefined,
            seller: {
              id: saleSeller.id,
              store_name: saleSeller.store_name,
              email: saleSeller.email,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(saleSeller.status),
              email_verified: saleSeller.email_verified,
            },
            category: {
              id: category.id,
              name: category.name,
              slug: category.slug,
              description: category.description ?? undefined,
              image_url: category.image_url ?? undefined,
              parent_id: category.parent_id ?? undefined,
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
        variant_attributes: item.variant_attributes ?? undefined,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
        discount_amount: item.discount_amount,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at
          ? toISOStringSafe(item.deleted_at)
          : undefined,
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
      id: buyer.id,
      email: buyer.email,
      full_name: buyer.full_name,
      phone_number: buyer.phone_number ?? undefined,
    },
    deliveryAddress: {
      id: buyerAddress.id,
      recipient_name: buyerAddress.recipient_name,
      street_address_line1: buyerAddress.street_address_line1,
      city: buyerAddress.city,
      state: buyerAddress.state,
      postal_code: buyerAddress.postal_code,
      country: buyerAddress.country,
      address_label: buyerAddress.address_label,
    },
    subtotal: order.subtotal,
    shipping_total: order.shipping_total,
    tax_total: order.tax_total,
    discount_total: order.discount_total,
    total_amount: order.total_amount,
    estimated_delivery_start: order.estimated_delivery_start
      ? toISOStringSafe(order.estimated_delivery_start)
      : undefined,
    estimated_delivery_end: order.estimated_delivery_end
      ? toISOStringSafe(order.estimated_delivery_end)
      : undefined,
    actual_delivery_at: order.actual_delivery_at
      ? toISOStringSafe(order.actual_delivery_at)
      : undefined,
    cancelled_at: order.cancelled_at
      ? toISOStringSafe(order.cancelled_at)
      : undefined,
    completed_at: order.completed_at
      ? toISOStringSafe(order.completed_at)
      : undefined,
    deleted_at: order.deleted_at
      ? toISOStringSafe(order.deleted_at)
      : undefined,
    sellers,
    items,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
  };
}
