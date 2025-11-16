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

export async function putShoppingMallBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const existingOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_buyer_id: true,
      shopping_mall_buyer_address_id: true,
      status: true,
      deleted_at: true,
    },
  });

  if (!existingOrder || existingOrder.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  if (existingOrder.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException(
      "You do not have permission to update this order",
      403,
    );
  }

  const nonEditableStatuses = [
    "shipped",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled_payment_failed",
    "cancelled_buyer_request",
    "cancelled_seller_unavailable",
    "cancelled_admin_action",
    "delivery_failed",
    "returned_to_sender",
    "refund_requested",
    "refund_approved",
    "refund_denied",
    "refunded",
  ];

  if (nonEditableStatuses.includes(existingOrder.status)) {
    throw new HttpException("Order cannot be updated in current status", 400);
  }

  if (props.body.shipping_address_id) {
    const address =
      await MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
        where: { id: props.body.shipping_address_id },
        select: {
          id: true,
          shopping_mall_buyer_id: true,
        },
      });

    if (!address) {
      throw new HttpException("Delivery address not found", 404);
    }

    if (address.shopping_mall_buyer_id !== props.buyer.id) {
      throw new HttpException("Delivery address does not belong to you", 403);
    }
  }

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      ...(props.body.shipping_address_id && {
        shopping_mall_buyer_address_id: props.body.shipping_address_id,
      }),
      updated_at: new Date(),
    },
  });

  const updatedOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!updatedOrder) {
    throw new HttpException("Order not found after update", 500);
  }

  const [buyerData, addressData, sellerOrders, orderItems] = await Promise.all([
    MyGlobal.prisma.shopping_mall_buyers.findUnique({
      where: { id: updatedOrder.shopping_mall_buyer_id },
    }),
    MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
      where: { id: updatedOrder.shopping_mall_buyer_address_id },
    }),
    MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: { shopping_mall_order_id: props.orderId },
    }),
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: props.orderId },
    }),
  ]);

  if (!buyerData) {
    throw new HttpException("Buyer data not found", 500);
  }

  if (!addressData) {
    throw new HttpException("Address data not found", 500);
  }

  const itemsWithDetails = await Promise.all(
    orderItems.map(async (item) => {
      const skuData = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
        where: { id: item.shopping_mall_sale_sku_id },
      });

      if (!skuData) {
        throw new HttpException("SKU not found", 500);
      }

      const saleData = await MyGlobal.prisma.shopping_mall_sales.findUnique({
        where: { id: skuData.shopping_mall_sale_id },
      });

      if (!saleData) {
        throw new HttpException("Sale not found", 500);
      }

      const [saleSellerData, categoryData] = await Promise.all([
        MyGlobal.prisma.shopping_mall_sellers.findUnique({
          where: { id: saleData.shopping_mall_seller_id },
        }),
        MyGlobal.prisma.shopping_mall_categories.findUnique({
          where: { id: saleData.shopping_mall_category_id },
        }),
      ]);

      if (!saleSellerData || !categoryData) {
        throw new HttpException("Sale related data not found", 500);
      }

      return {
        id: item.id,
        shopping_mall_order_id: item.shopping_mall_order_id,
        shopping_mall_order_seller_id: item.shopping_mall_order_seller_id,
        shopping_mall_sale_sku_id: item.shopping_mall_sale_sku_id,
        saleSku: {
          id: skuData.id,
          sku_code: skuData.sku_code,
          variant_combination: skuData.variant_combination,
          base_price: skuData.base_price,
          price: skuData.sale_price ?? skuData.base_price,
          enabled: skuData.enabled,
          sale: {
            id: saleData.id,
            code: saleData.code,
            title: saleData.title,
            status: typia.assert<
              | "draft"
              | "pending_approval"
              | "published"
              | "suspended"
              | "archived"
            >(saleData.status),
            condition: typia.assert<"new" | "refurbished" | "used">(
              saleData.condition,
            ),
            brand: saleData.brand ?? undefined,
            short_description: saleData.short_description ?? undefined,
            price: skuData.base_price,
            thumbnail_url: undefined,
            return_policy_days: saleData.return_policy_days,
            warranty_info: saleData.warranty_info ?? undefined,
            created_at: toISOStringSafe(saleData.created_at),
            updated_at: toISOStringSafe(saleData.updated_at),
            deleted_at: saleData.deleted_at
              ? toISOStringSafe(saleData.deleted_at)
              : null,
            seller: {
              id: saleSellerData.id,
              store_name: saleSellerData.store_name,
              email: saleSellerData.email,
              status: typia.assert<
                "pending" | "approved" | "rejected" | "suspended"
              >(saleSellerData.status),
              email_verified: saleSellerData.email_verified,
            },
            category: {
              id: categoryData.id,
              name: categoryData.name,
              slug: categoryData.slug,
              description: categoryData.description ?? undefined,
              image_url: categoryData.image_url ?? undefined,
              parent_id: categoryData.parent_id ?? undefined,
              status: categoryData.status,
              display_order: categoryData.display_order,
              product_count: categoryData.product_count,
              created_at: toISOStringSafe(categoryData.created_at),
              updated_at: toISOStringSafe(categoryData.updated_at),
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

  const finalSellerOrders = await Promise.all(
    sellerOrders.map(async (sellerOrder) => {
      const sellerData = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
        {
          where: { id: sellerOrder.shopping_mall_seller_id },
        },
      );

      if (!sellerData) {
        throw new HttpException("Seller data not found", 500);
      }

      const sellerItems = itemsWithDetails.filter(
        (item) => item.shopping_mall_order_seller_id === sellerOrder.id,
      );

      return {
        id: sellerOrder.id,
        shopping_mall_order_id: sellerOrder.shopping_mall_order_id,
        shopping_mall_seller_id: sellerOrder.shopping_mall_seller_id,
        sub_order_number: sellerOrder.sub_order_number,
        status: sellerOrder.status,
        seller: {
          id: sellerData.id,
          store_name: sellerData.store_name,
          email: sellerData.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(sellerData.status),
          email_verified: sellerData.email_verified,
        },
        subtotal: sellerOrder.subtotal,
        shipping_cost: sellerOrder.shipping_cost,
        shipping_method: sellerOrder.shipping_method,
        tracking_number: sellerOrder.tracking_number ?? undefined,
        carrier_name: sellerOrder.carrier_name ?? undefined,
        shipped_at: sellerOrder.shipped_at
          ? toISOStringSafe(sellerOrder.shipped_at)
          : null,
        delivered_at: sellerOrder.delivered_at
          ? toISOStringSafe(sellerOrder.delivered_at)
          : null,
        items: sellerItems,
        created_at: toISOStringSafe(sellerOrder.created_at),
        updated_at: toISOStringSafe(sellerOrder.updated_at),
        deleted_at: sellerOrder.deleted_at
          ? toISOStringSafe(sellerOrder.deleted_at)
          : null,
      };
    }),
  );

  return {
    id: updatedOrder.id,
    shopping_mall_buyer_id: updatedOrder.shopping_mall_buyer_id,
    shopping_mall_buyer_address_id: updatedOrder.shopping_mall_buyer_address_id,
    order_number: updatedOrder.order_number,
    status: updatedOrder.status,
    buyer: {
      id: buyerData.id,
      email: buyerData.email,
      full_name: buyerData.full_name,
      phone_number: buyerData.phone_number ?? undefined,
    },
    deliveryAddress: {
      id: addressData.id,
      recipient_name: addressData.recipient_name,
      street_address_line1: addressData.street_address_line1,
      city: addressData.city,
      state: addressData.state,
      postal_code: addressData.postal_code,
      country: addressData.country,
      address_label: addressData.address_label,
    },
    subtotal: updatedOrder.subtotal,
    shipping_total: updatedOrder.shipping_total,
    tax_total: updatedOrder.tax_total,
    discount_total: updatedOrder.discount_total,
    total_amount: updatedOrder.total_amount,
    estimated_delivery_start: updatedOrder.estimated_delivery_start
      ? toISOStringSafe(updatedOrder.estimated_delivery_start)
      : null,
    estimated_delivery_end: updatedOrder.estimated_delivery_end
      ? toISOStringSafe(updatedOrder.estimated_delivery_end)
      : null,
    actual_delivery_at: updatedOrder.actual_delivery_at
      ? toISOStringSafe(updatedOrder.actual_delivery_at)
      : null,
    cancelled_at: updatedOrder.cancelled_at
      ? toISOStringSafe(updatedOrder.cancelled_at)
      : null,
    completed_at: updatedOrder.completed_at
      ? toISOStringSafe(updatedOrder.completed_at)
      : null,
    deleted_at: updatedOrder.deleted_at
      ? toISOStringSafe(updatedOrder.deleted_at)
      : null,
    sellers: finalSellerOrders,
    items: itemsWithDetails,
    created_at: toISOStringSafe(updatedOrder.created_at),
    updated_at: toISOStringSafe(updatedOrder.updated_at),
  };
}
