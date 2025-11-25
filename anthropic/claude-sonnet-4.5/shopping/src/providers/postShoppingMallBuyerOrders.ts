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

export async function postShoppingMallBuyerOrders(props: {
  buyer: BuyerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const now = new Date();
  const nowStr = toISOStringSafe(now);

  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      id: { in: props.body.cart_item_ids },
      shopping_mall_buyer_id: props.buyer.id,
      deleted_at: null,
    },
  });

  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 400);
  }

  if (cartItems.length !== props.body.cart_item_ids.length) {
    throw new HttpException(
      "Some cart items not found or do not belong to buyer",
      404,
    );
  }

  const skuIds = cartItems.map((item) => item.shopping_mall_sale_sku_id);
  const skus = await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
    where: { id: { in: skuIds } },
  });

  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  const saleIds = skus.map((sku) => sku.shopping_mall_sale_id);
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: { id: { in: saleIds } },
  });

  const saleMap = new Map(sales.map((sale) => [sale.id, sale]));

  const sellerIds = sales.map((sale) => sale.shopping_mall_seller_id);
  const sellers = await MyGlobal.prisma.shopping_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
  });

  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));

  const categoryIds = sales.map((sale) => sale.shopping_mall_category_id);
  const categories = await MyGlobal.prisma.shopping_mall_categories.findMany({
    where: { id: { in: categoryIds } },
  });

  const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

  for (const item of cartItems) {
    const sku = skuMap.get(item.shopping_mall_sale_sku_id);
    if (!sku) {
      throw new HttpException("Product SKU not found", 404);
    }
    if (!sku.enabled) {
      throw new HttpException("Product SKU is not available", 400);
    }
    const sale = saleMap.get(sku.shopping_mall_sale_id);
    if (!sale) {
      throw new HttpException("Product not found", 404);
    }
    if (sale.status !== "published") {
      throw new HttpException("Product is not available for purchase", 400);
    }
  }

  const address = await MyGlobal.prisma.shopping_mall_buyer_addresses.findFirst(
    {
      where: {
        id: props.body.buyer_address_id,
        shopping_mall_buyer_id: props.buyer.id,
      },
    },
  );

  if (!address) {
    throw new HttpException(
      "Delivery address not found or does not belong to buyer",
      404,
    );
  }

  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findFirst({
      where: {
        id: props.body.payment_method_id,
        shopping_mall_buyer_id: props.buyer.id,
        deleted_at: null,
        is_verified: true,
      },
    });

  if (!paymentMethod) {
    throw new HttpException(
      "Payment method not found, not verified, or does not belong to buyer",
      404,
    );
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: { id: props.buyer.id },
  });

  if (!buyer) {
    throw new HttpException("Buyer not found", 404);
  }

  const itemsBySeller = new Map<string, typeof cartItems>();
  for (const item of cartItems) {
    const sku = skuMap.get(item.shopping_mall_sale_sku_id);
    if (!sku) continue;
    const sale = saleMap.get(sku.shopping_mall_sale_id);
    if (!sale) continue;
    const sellerId = sale.shopping_mall_seller_id;
    if (!itemsBySeller.has(sellerId)) {
      itemsBySeller.set(sellerId, []);
    }
    itemsBySeller.get(sellerId)!.push(item);
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const sku = skuMap.get(item.shopping_mall_sale_sku_id);
    return sum + (sku ? sku.base_price * item.quantity : 0);
  }, 0);

  const shippingTotal = itemsBySeller.size * 10.0;
  const taxTotal = subtotal * 0.1;
  const discountTotal = 0.0;
  const totalAmount = subtotal + shippingTotal + taxTotal - discountTotal;

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomNum = String(Math.floor(Math.random() * 1000000)).padStart(
    6,
    "0",
  );
  const orderNumber = `ORD-${dateStr}-${randomNum}`;
  const orderId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_orders.create({
      data: {
        id: orderId,
        shopping_mall_buyer_id: props.buyer.id,
        shopping_mall_buyer_address_id: props.body.buyer_address_id,
        order_number: orderNumber,
        status: "payment_confirmed",
        subtotal,
        shipping_total: shippingTotal,
        tax_total: taxTotal,
        discount_total: discountTotal,
        total_amount: totalAmount,
        created_at: nowStr,
        updated_at: nowStr,
      },
    });

    let sellerIndex = 1;
    for (const [sellerId, items] of itemsBySeller.entries()) {
      const sellerSubtotal = items.reduce((sum, item) => {
        const sku = skuMap.get(item.shopping_mall_sale_sku_id);
        return sum + (sku ? sku.base_price * item.quantity : 0);
      }, 0);

      const sellerShippingCost = 10.0;
      const subOrderNumber = `${orderNumber}-S${sellerIndex}`;
      const sellerOrderId = v4() as string & tags.Format<"uuid">;

      await tx.shopping_mall_order_sellers.create({
        data: {
          id: sellerOrderId,
          shopping_mall_order_id: orderId,
          shopping_mall_seller_id: sellerId,
          sub_order_number: subOrderNumber,
          status: "payment_confirmed",
          subtotal: sellerSubtotal,
          shipping_cost: sellerShippingCost,
          shipping_method: "standard",
          created_at: nowStr,
          updated_at: nowStr,
        },
      });

      for (const cartItem of items) {
        const sku = skuMap.get(cartItem.shopping_mall_sale_sku_id);
        if (!sku) continue;
        const sale = saleMap.get(sku.shopping_mall_sale_id);
        if (!sale) continue;
        const lineTotal = sku.base_price * cartItem.quantity;

        await tx.shopping_mall_order_items.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            shopping_mall_order_id: orderId,
            shopping_mall_order_seller_id: sellerOrderId,
            shopping_mall_sale_sku_id: sku.id,
            product_name: sale.title,
            sku_code: sku.sku_code,
            variant_attributes: sku.variant_combination,
            unit_price: sku.base_price,
            quantity: cartItem.quantity,
            line_total: lineTotal,
            discount_amount: 0.0,
            created_at: nowStr,
            updated_at: nowStr,
          },
        });

        await tx.shopping_mall_inventory_reservations.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            shopping_mall_sale_sku_id: sku.id,
            shopping_mall_buyer_id: props.buyer.id,
            shopping_mall_order_id: orderId,
            reserved_quantity: cartItem.quantity,
            reservation_status: "converted",
            expires_at: toISOStringSafe(
              new Date(now.getTime() + 30 * 60 * 1000),
            ),
            created_at: nowStr,
            updated_at: nowStr,
          },
        });
      }

      sellerIndex++;
    }

    await tx.shopping_mall_payment_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_order_id: orderId,
        shopping_mall_buyer_id: props.buyer.id,
        shopping_mall_payment_method_id: props.body.payment_method_id,
        transaction_type: "capture",
        amount: totalAmount,
        currency: "USD",
        status: "captured",
        provider: paymentMethod.provider,
        provider_transaction_id: `txn_${v4()}`,
        created_at: nowStr,
      },
    });

    await tx.shopping_mall_cart_items.deleteMany({
      where: {
        id: { in: props.body.cart_item_ids },
      },
    });
  });

  const createdOrder = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
  });

  if (!createdOrder) {
    throw new HttpException("Order creation failed", 500);
  }

  const orderSellerRecords =
    await MyGlobal.prisma.shopping_mall_order_sellers.findMany({
      where: { shopping_mall_order_id: orderId },
    });

  const orderItemRecords =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: { shopping_mall_order_id: orderId },
    });

  return {
    id: createdOrder.id,
    shopping_mall_buyer_id: createdOrder.shopping_mall_buyer_id,
    shopping_mall_buyer_address_id: createdOrder.shopping_mall_buyer_address_id,
    order_number: createdOrder.order_number,
    status: createdOrder.status,
    buyer: {
      id: buyer.id,
      email: buyer.email,
      full_name: buyer.full_name,
      phone_number:
        buyer.phone_number === null ? undefined : buyer.phone_number,
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
    subtotal: createdOrder.subtotal,
    shipping_total: createdOrder.shipping_total,
    tax_total: createdOrder.tax_total,
    discount_total: createdOrder.discount_total,
    total_amount: createdOrder.total_amount,
    estimated_delivery_start:
      createdOrder.estimated_delivery_start === null
        ? undefined
        : toISOStringSafe(createdOrder.estimated_delivery_start),
    estimated_delivery_end:
      createdOrder.estimated_delivery_end === null
        ? undefined
        : toISOStringSafe(createdOrder.estimated_delivery_end),
    actual_delivery_at:
      createdOrder.actual_delivery_at === null
        ? undefined
        : toISOStringSafe(createdOrder.actual_delivery_at),
    cancelled_at:
      createdOrder.cancelled_at === null
        ? undefined
        : toISOStringSafe(createdOrder.cancelled_at),
    completed_at:
      createdOrder.completed_at === null
        ? undefined
        : toISOStringSafe(createdOrder.completed_at),
    deleted_at:
      createdOrder.deleted_at === null
        ? undefined
        : toISOStringSafe(createdOrder.deleted_at),
    sellers: orderSellerRecords.map((sellerOrder) => {
      const seller = sellerMap.get(sellerOrder.shopping_mall_seller_id);
      if (!seller) {
        throw new HttpException("Seller not found", 500);
      }

      const sellerItems = orderItemRecords.filter(
        (item) => item.shopping_mall_order_seller_id === sellerOrder.id,
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
          email: seller.email,
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
        tracking_number:
          sellerOrder.tracking_number === null
            ? undefined
            : sellerOrder.tracking_number,
        carrier_name:
          sellerOrder.carrier_name === null
            ? undefined
            : sellerOrder.carrier_name,
        shipped_at:
          sellerOrder.shipped_at === null
            ? undefined
            : toISOStringSafe(sellerOrder.shipped_at),
        delivered_at:
          sellerOrder.delivered_at === null
            ? undefined
            : toISOStringSafe(sellerOrder.delivered_at),
        items: sellerItems.map((item) => {
          const sku = skuMap.get(item.shopping_mall_sale_sku_id);
          if (!sku) {
            throw new HttpException("SKU not found", 500);
          }
          const sale = saleMap.get(sku.shopping_mall_sale_id);
          if (!sale) {
            throw new HttpException("Sale not found", 500);
          }
          const itemSeller = sellerMap.get(sale.shopping_mall_seller_id);
          if (!itemSeller) {
            throw new HttpException("Item seller not found", 500);
          }
          const category = categoryMap.get(sale.shopping_mall_category_id);
          if (!category) {
            throw new HttpException("Category not found", 500);
          }
          const salePrice =
            sku.sale_price === null ? sku.base_price : sku.sale_price;

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
              price: salePrice,
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
                deleted_at:
                  sale.deleted_at === null
                    ? undefined
                    : toISOStringSafe(sale.deleted_at),
                seller: {
                  id: itemSeller.id,
                  store_name: itemSeller.store_name,
                  email: itemSeller.email,
                  status: itemSeller.status as
                    | "pending"
                    | "approved"
                    | "rejected"
                    | "suspended",
                  email_verified: itemSeller.email_verified,
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
                    category.image_url === null
                      ? undefined
                      : (category.image_url as string & tags.Format<"uri">),
                  parent_id:
                    category.parent_id === null
                      ? undefined
                      : (category.parent_id as string & tags.Format<"uuid">),
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
            deleted_at:
              item.deleted_at === null
                ? undefined
                : toISOStringSafe(item.deleted_at),
          };
        }),
        created_at: toISOStringSafe(sellerOrder.created_at),
        updated_at: toISOStringSafe(sellerOrder.updated_at),
        deleted_at:
          sellerOrder.deleted_at === null
            ? undefined
            : toISOStringSafe(sellerOrder.deleted_at),
      };
    }),
    items: orderItemRecords.map((item) => {
      const sku = skuMap.get(item.shopping_mall_sale_sku_id);
      if (!sku) {
        throw new HttpException("SKU not found", 500);
      }
      const sale = saleMap.get(sku.shopping_mall_sale_id);
      if (!sale) {
        throw new HttpException("Sale not found", 500);
      }
      const itemSeller = sellerMap.get(sale.shopping_mall_seller_id);
      if (!itemSeller) {
        throw new HttpException("Item seller not found", 500);
      }
      const category = categoryMap.get(sale.shopping_mall_category_id);
      if (!category) {
        throw new HttpException("Category not found", 500);
      }
      const salePrice =
        sku.sale_price === null ? sku.base_price : sku.sale_price;

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
          price: salePrice,
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
            deleted_at:
              sale.deleted_at === null
                ? undefined
                : toISOStringSafe(sale.deleted_at),
            seller: {
              id: itemSeller.id,
              store_name: itemSeller.store_name,
              email: itemSeller.email,
              status: itemSeller.status as
                | "pending"
                | "approved"
                | "rejected"
                | "suspended",
              email_verified: itemSeller.email_verified,
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
                category.image_url === null
                  ? undefined
                  : (category.image_url as string & tags.Format<"uri">),
              parent_id:
                category.parent_id === null
                  ? undefined
                  : (category.parent_id as string & tags.Format<"uuid">),
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
        deleted_at:
          item.deleted_at === null
            ? undefined
            : toISOStringSafe(item.deleted_at),
      };
    }),
    created_at: toISOStringSafe(createdOrder.created_at),
    updated_at: toISOStringSafe(createdOrder.updated_at),
  };
}
