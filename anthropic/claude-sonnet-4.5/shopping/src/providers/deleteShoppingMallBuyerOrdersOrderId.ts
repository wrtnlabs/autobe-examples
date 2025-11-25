import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function deleteShoppingMallBuyerOrdersOrderId(props: {
  buyer: BuyerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (order.deleted_at !== null) {
    throw new HttpException("Order already deleted", 400);
  }

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: props.orderId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });

  const [buyerData, deliveryAddressData, sellersRawData, itemsData] =
    await Promise.all([
      MyGlobal.prisma.shopping_mall_buyers.findUnique({
        where: { id: order.shopping_mall_buyer_id },
      }),
      MyGlobal.prisma.shopping_mall_buyer_addresses.findUnique({
        where: { id: order.shopping_mall_buyer_address_id },
      }),
      MyGlobal.prisma.shopping_mall_order_sellers.findMany({
        where: { shopping_mall_order_id: props.orderId },
      }),
      MyGlobal.prisma.shopping_mall_order_items.findMany({
        where: { shopping_mall_order_id: props.orderId },
      }),
    ]);

  if (!buyerData) {
    throw new HttpException("Buyer not found", 404);
  }

  if (!deliveryAddressData) {
    throw new HttpException("Delivery address not found", 404);
  }

  const sellerIds = sellersRawData.map((s) => s.shopping_mall_seller_id);
  const sellersInfoData = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
  });
  const sellerInfoMap = new Map(sellersInfoData.map((s) => [s.id, s]));

  const skuIds = itemsData.map((item) => item.shopping_mall_sale_sku_id);
  const skusRawData = await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
    where: { id: { in: skuIds } },
  });

  const saleIds = skusRawData.map((sku) => sku.shopping_mall_sale_id);
  const salesData = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: { id: { in: saleIds } },
  });

  const saleSellerIds = salesData.map((sale) => sale.shopping_mall_seller_id);
  const saleSellerData = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: saleSellerIds } },
  });
  const saleSellerMap = new Map(saleSellerData.map((s) => [s.id, s]));

  const categoryIds = salesData.map((sale) => sale.shopping_mall_category_id);
  const categoriesData =
    await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { id: { in: categoryIds } },
    });
  const categoryMap = new Map(categoriesData.map((c) => [c.id, c]));

  const saleMap = new Map(salesData.map((sale) => [sale.id, sale]));
  const skuMap = new Map(skusRawData.map((sku) => [sku.id, sku]));

  const sellerItemsMap = new Map<string, typeof itemsData>();
  for (const item of itemsData) {
    const sellerId = item.shopping_mall_order_seller_id;
    if (!sellerItemsMap.has(sellerId)) {
      sellerItemsMap.set(sellerId, []);
    }
    sellerItemsMap.get(sellerId)!.push(item);
  }

  const updatedOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: props.orderId },
  });

  if (!updatedOrder) {
    throw new HttpException("Order not found after update", 404);
  }

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
      id: deliveryAddressData.id,
      recipient_name: deliveryAddressData.recipient_name,
      street_address_line1: deliveryAddressData.street_address_line1,
      city: deliveryAddressData.city,
      state: deliveryAddressData.state,
      postal_code: deliveryAddressData.postal_code,
      country: deliveryAddressData.country,
      address_label: deliveryAddressData.address_label,
    },
    subtotal: updatedOrder.subtotal,
    shipping_total: updatedOrder.shipping_total,
    tax_total: updatedOrder.tax_total,
    discount_total: updatedOrder.discount_total,
    total_amount: updatedOrder.total_amount,
    estimated_delivery_start: updatedOrder.estimated_delivery_start
      ? toISOStringSafe(updatedOrder.estimated_delivery_start)
      : undefined,
    estimated_delivery_end: updatedOrder.estimated_delivery_end
      ? toISOStringSafe(updatedOrder.estimated_delivery_end)
      : undefined,
    actual_delivery_at: updatedOrder.actual_delivery_at
      ? toISOStringSafe(updatedOrder.actual_delivery_at)
      : undefined,
    cancelled_at: updatedOrder.cancelled_at
      ? toISOStringSafe(updatedOrder.cancelled_at)
      : undefined,
    completed_at: updatedOrder.completed_at
      ? toISOStringSafe(updatedOrder.completed_at)
      : undefined,
    deleted_at: updatedOrder.deleted_at
      ? toISOStringSafe(updatedOrder.deleted_at)
      : undefined,
    sellers: sellersRawData.map((seller) => {
      const sellerItems = sellerItemsMap.get(seller.id) ?? [];
      const sellerInfo = sellerInfoMap.get(seller.shopping_mall_seller_id);
      if (!sellerInfo) {
        throw new HttpException("Seller info not found", 404);
      }
      return {
        id: seller.id,
        shopping_mall_order_id: seller.shopping_mall_order_id,
        shopping_mall_seller_id: seller.shopping_mall_seller_id,
        sub_order_number: seller.sub_order_number,
        status: seller.status,
        seller: {
          id: sellerInfo.id,
          store_name: sellerInfo.store_name,
          email: sellerInfo.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(sellerInfo.status),
          email_verified: sellerInfo.email_verified,
        },
        subtotal: seller.subtotal,
        shipping_cost: seller.shipping_cost,
        shipping_method: seller.shipping_method,
        tracking_number: seller.tracking_number ?? undefined,
        carrier_name: seller.carrier_name ?? undefined,
        shipped_at: seller.shipped_at
          ? toISOStringSafe(seller.shipped_at)
          : undefined,
        delivered_at: seller.delivered_at
          ? toISOStringSafe(seller.delivered_at)
          : undefined,
        items: sellerItems.map((item) => {
          const sku = skuMap.get(item.shopping_mall_sale_sku_id);
          if (!sku) {
            throw new HttpException("SKU not found", 404);
          }
          const sale = saleMap.get(sku.shopping_mall_sale_id);
          if (!sale) {
            throw new HttpException("Sale not found", 404);
          }
          const saleSeller = saleSellerMap.get(sale.shopping_mall_seller_id);
          if (!saleSeller) {
            throw new HttpException("Sale seller not found", 404);
          }
          const category = categoryMap.get(sale.shopping_mall_category_id);
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
        created_at: toISOStringSafe(seller.created_at),
        updated_at: toISOStringSafe(seller.updated_at),
        deleted_at: seller.deleted_at
          ? toISOStringSafe(seller.deleted_at)
          : undefined,
      };
    }),
    items: itemsData.map((item) => {
      const sku = skuMap.get(item.shopping_mall_sale_sku_id);
      if (!sku) {
        throw new HttpException("SKU not found", 404);
      }
      const sale = saleMap.get(sku.shopping_mall_sale_id);
      if (!sale) {
        throw new HttpException("Sale not found", 404);
      }
      const saleSeller = saleSellerMap.get(sale.shopping_mall_seller_id);
      if (!saleSeller) {
        throw new HttpException("Sale seller not found", 404);
      }
      const category = categoryMap.get(sale.shopping_mall_category_id);
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
    created_at: toISOStringSafe(updatedOrder.created_at),
    updated_at: toISOStringSafe(updatedOrder.updated_at),
  };
}
