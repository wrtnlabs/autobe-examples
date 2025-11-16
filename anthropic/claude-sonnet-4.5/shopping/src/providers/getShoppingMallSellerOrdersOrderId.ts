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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderId(props: {
  seller: SellerPayload;
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

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: order.shopping_mall_buyer_id },
  });

  if (!buyer) {
    throw new HttpException("Buyer information not found", 404);
  }

  const address =
    await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: order.shopping_mall_buyer_address_id },
    });

  if (!address) {
    throw new HttpException("Delivery address not found", 404);
  }

  const sellerOrders =
    await MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });

  const hasSellerAccess = sellerOrders.some(
    (sellerOrder) => sellerOrder.shopping_mall_seller_id === props.seller.id,
  );

  if (!hasSellerAccess) {
    throw new HttpException(
      "You do not have permission to access this order",
      403,
    );
  }

  const sellers = await Promise.all(
    sellerOrders.map(async (sellerOrder) => {
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: sellerOrder.shopping_mall_seller_id },
      });

      if (!seller) {
        throw new HttpException("Seller not found", 404);
      }

      const orderItems =
        await MyGlobal.prisma.shopping_mall_order_items.findMany({
          where: {
            shopping_mall_order_seller_id: sellerOrder.id,
            deleted_at: null,
          },
        });

      const items = await Promise.all(
        orderItems.map(async (item) => {
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
            throw new HttpException("Product not found", 404);
          }

          const saleSeller =
            await MyGlobal.prisma.shopping_mall_sellers.findUnique({
              where: { id: sale.shopping_mall_seller_id },
            });

          if (!saleSeller) {
            throw new HttpException("Product seller not found", 404);
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
                brand: sale.brand ?? undefined,
                short_description: sale.short_description ?? undefined,
                price: sku.base_price,
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
                  email: saleSeller.email as string & tags.Format<"email">,
                  status: saleSeller.status as
                    | "pending"
                    | "approved"
                    | "rejected"
                    | "suspended",
                  email_verified: saleSeller.email_verified,
                },
                category: {
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                  description: category.description ?? undefined,
                  image_url: category.image_url
                    ? (category.image_url as string & tags.Format<"uri">)
                    : undefined,
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
        id: sellerOrder.id,
        shopping_mall_order_id: sellerOrder.shopping_mall_order_id,
        shopping_mall_seller_id: sellerOrder.shopping_mall_seller_id,
        sub_order_number: sellerOrder.sub_order_number,
        status: sellerOrder.status,
        seller: {
          id: seller.id,
          store_name: seller.store_name,
          email: seller.email as string & tags.Format<"email">,
          status: seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: seller.email_verified,
        },
        subtotal: sellerOrder.subtotal,
        shipping_cost: sellerOrder.shipping_cost,
        shipping_method: sellerOrder.shipping_method,
        tracking_number: sellerOrder.tracking_number ?? undefined,
        carrier_name: sellerOrder.carrier_name ?? undefined,
        shipped_at: sellerOrder.shipped_at
          ? toISOStringSafe(sellerOrder.shipped_at)
          : undefined,
        delivered_at: sellerOrder.delivered_at
          ? toISOStringSafe(sellerOrder.delivered_at)
          : undefined,
        items,
        created_at: toISOStringSafe(sellerOrder.created_at),
        updated_at: toISOStringSafe(sellerOrder.updated_at),
        deleted_at: sellerOrder.deleted_at
          ? toISOStringSafe(sellerOrder.deleted_at)
          : undefined,
      };
    }),
  );

  const allOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
      },
    });

  const items = await Promise.all(
    allOrderItems.map(async (item) => {
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
        throw new HttpException("Product not found", 404);
      }

      const saleSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
        {
          where: { id: sale.shopping_mall_seller_id },
        },
      );

      if (!saleSeller) {
        throw new HttpException("Product seller not found", 404);
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
            brand: sale.brand ?? undefined,
            short_description: sale.short_description ?? undefined,
            price: sku.base_price,
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
              email: saleSeller.email as string & tags.Format<"email">,
              status: saleSeller.status as
                | "pending"
                | "approved"
                | "rejected"
                | "suspended",
              email_verified: saleSeller.email_verified,
            },
            category: {
              id: category.id,
              name: category.name,
              slug: category.slug,
              description: category.description ?? undefined,
              image_url: category.image_url
                ? (category.image_url as string & tags.Format<"uri">)
                : undefined,
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
      email: buyer.email as string & tags.Format<"email">,
      full_name: buyer.full_name,
      phone_number: buyer.phone_number ?? undefined,
    },
    deliveryAddress: {
      id: address.id,
      recipient_name: address.recipient_name,
      street_address_line1: address.street_address_line1,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      address_label: address.address_label,
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
