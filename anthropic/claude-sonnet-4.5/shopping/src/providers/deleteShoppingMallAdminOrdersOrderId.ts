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

export async function deleteShoppingMallAdminOrdersOrderId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const now = new Date();

  const deletedOrder = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingOrder = await tx.shopping_mall_orders.findUnique({
      where: { id: props.orderId },
    });

    if (!existingOrder) {
      throw new HttpException("Order not found", 404);
    }

    await tx.shopping_mall_order_items.updateMany({
      where: { shopping_mall_order_id: props.orderId },
      data: { deleted_at: now },
    });

    await tx.shopping_mall_order_sellers.updateMany({
      where: { shopping_mall_order_id: props.orderId },
      data: { deleted_at: now },
    });

    const updated = await tx.shopping_mall_orders.update({
      where: { id: props.orderId },
      data: { deleted_at: now },
    });

    const buyer = await tx.shopping_mall_buyers.findUnique({
      where: { id: updated.shopping_mall_buyer_id },
    });

    const buyerAddress = await tx.shopping_mall_buyer_addresses.findUnique({
      where: { id: updated.shopping_mall_buyer_address_id },
    });

    const orderSellers = await tx.shopping_mall_order_sellers.findMany({
      where: { shopping_mall_order_id: updated.id },
    });

    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: updated.id },
    });

    const sellerIds = [
      ...new Set(orderSellers.map((s) => s.shopping_mall_seller_id)),
    ];
    const sellers = await tx.shopping_mall_sellers.findMany({
      where: { id: { in: sellerIds } },
    });

    const skuIds = [
      ...new Set(orderItems.map((i) => i.shopping_mall_sale_sku_id)),
    ];
    const skus = await tx.shopping_mall_sale_skus.findMany({
      where: { id: { in: skuIds } },
    });

    const saleIds = [...new Set(skus.map((sku) => sku.shopping_mall_sale_id))];
    const sales = await tx.shopping_mall_sales.findMany({
      where: { id: { in: saleIds } },
    });

    const categoryIds = [
      ...new Set(sales.map((s) => s.shopping_mall_category_id)),
    ];
    const categories = await tx.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
    });

    return {
      updated,
      buyer,
      buyerAddress,
      orderSellers,
      orderItems,
      sellers,
      skus,
      sales,
      categories,
    };
  });

  if (!deletedOrder.buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  if (!deletedOrder.buyerAddress) {
    throw new HttpException("Buyer address not found", 404);
  }

  const sellerMap = new Map(deletedOrder.sellers.map((s) => [s.id, s]));
  const skuMap = new Map(deletedOrder.skus.map((sku) => [sku.id, sku]));
  const saleMap = new Map(deletedOrder.sales.map((s) => [s.id, s]));
  const categoryMap = new Map(deletedOrder.categories.map((c) => [c.id, c]));

  const mappedSellers = deletedOrder.orderSellers.map((orderSeller) => {
    const seller = sellerMap.get(orderSeller.shopping_mall_seller_id);
    if (!seller) {
      throw new HttpException("Seller data inconsistency", 500);
    }

    const sellerItems = deletedOrder.orderItems.filter(
      (item) => item.shopping_mall_order_seller_id === orderSeller.id,
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
        status: typia.assert<"pending" | "approved" | "rejected" | "suspended">(
          seller.status,
        ),
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
      items: sellerItems.map((item) => {
        const sku = skuMap.get(item.shopping_mall_sale_sku_id);
        if (!sku) {
          throw new HttpException("SKU data inconsistency", 500);
        }

        const sale = saleMap.get(sku.shopping_mall_sale_id);
        if (!sale) {
          throw new HttpException("Sale data inconsistency", 500);
        }

        const category = categoryMap.get(sale.shopping_mall_category_id);
        if (!category) {
          throw new HttpException("Category data inconsistency", 500);
        }

        const saleSeller = sellerMap.get(sale.shopping_mall_seller_id);
        if (!saleSeller) {
          throw new HttpException("Sale seller data inconsistency", 500);
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
      created_at: toISOStringSafe(orderSeller.created_at),
      updated_at: toISOStringSafe(orderSeller.updated_at),
      deleted_at: orderSeller.deleted_at
        ? toISOStringSafe(orderSeller.deleted_at)
        : undefined,
    };
  });

  const mappedItems = deletedOrder.orderItems.map((item) => {
    const sku = skuMap.get(item.shopping_mall_sale_sku_id);
    if (!sku) {
      throw new HttpException("SKU data inconsistency", 500);
    }

    const sale = saleMap.get(sku.shopping_mall_sale_id);
    if (!sale) {
      throw new HttpException("Sale data inconsistency", 500);
    }

    const category = categoryMap.get(sale.shopping_mall_category_id);
    if (!category) {
      throw new HttpException("Category data inconsistency", 500);
    }

    const saleSeller = sellerMap.get(sale.shopping_mall_seller_id);
    if (!saleSeller) {
      throw new HttpException("Sale seller data inconsistency", 500);
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
  });

  return {
    id: deletedOrder.updated.id,
    shopping_mall_buyer_id: deletedOrder.updated.shopping_mall_buyer_id,
    shopping_mall_buyer_address_id:
      deletedOrder.updated.shopping_mall_buyer_address_id,
    order_number: deletedOrder.updated.order_number,
    status: deletedOrder.updated.status,
    buyer: {
      id: deletedOrder.buyer.id,
      email: deletedOrder.buyer.email,
      full_name: deletedOrder.buyer.full_name,
      phone_number: deletedOrder.buyer.phone_number ?? undefined,
    },
    deliveryAddress: {
      id: deletedOrder.buyerAddress.id,
      recipient_name: deletedOrder.buyerAddress.recipient_name,
      street_address_line1: deletedOrder.buyerAddress.street_address_line1,
      city: deletedOrder.buyerAddress.city,
      state: deletedOrder.buyerAddress.state,
      postal_code: deletedOrder.buyerAddress.postal_code,
      country: deletedOrder.buyerAddress.country,
      address_label: deletedOrder.buyerAddress.address_label,
    },
    subtotal: deletedOrder.updated.subtotal,
    shipping_total: deletedOrder.updated.shipping_total,
    tax_total: deletedOrder.updated.tax_total,
    discount_total: deletedOrder.updated.discount_total,
    total_amount: deletedOrder.updated.total_amount,
    estimated_delivery_start: deletedOrder.updated.estimated_delivery_start
      ? toISOStringSafe(deletedOrder.updated.estimated_delivery_start)
      : undefined,
    estimated_delivery_end: deletedOrder.updated.estimated_delivery_end
      ? toISOStringSafe(deletedOrder.updated.estimated_delivery_end)
      : undefined,
    actual_delivery_at: deletedOrder.updated.actual_delivery_at
      ? toISOStringSafe(deletedOrder.updated.actual_delivery_at)
      : undefined,
    cancelled_at: deletedOrder.updated.cancelled_at
      ? toISOStringSafe(deletedOrder.updated.cancelled_at)
      : undefined,
    completed_at: deletedOrder.updated.completed_at
      ? toISOStringSafe(deletedOrder.updated.completed_at)
      : undefined,
    deleted_at: deletedOrder.updated.deleted_at
      ? toISOStringSafe(deletedOrder.updated.deleted_at)
      : undefined,
    sellers: mappedSellers,
    items: mappedItems,
    created_at: toISOStringSafe(deletedOrder.updated.created_at),
    updated_at: toISOStringSafe(deletedOrder.updated.updated_at),
  };
}
