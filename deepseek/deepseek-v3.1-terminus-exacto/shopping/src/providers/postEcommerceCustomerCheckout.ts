import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerCheckout(props: {
  customer: CustomerPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IEcommerceOrder> {
  const currentTimestamp = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Validate customer exists and is active
    const customer = await prisma.ecommerce_customers.findFirstOrThrow({
      where: {
        id: props.customer.id,
        deleted_at: null,
      },
    });
    // Get customer's active shopping cart with items
    const cart = await prisma.ecommerce_shopping_carts.findFirstOrThrow({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
      include: {
        cartItems: {
          where: { deleted_at: null },
          include: {
            productVariant: {
              include: {
                product: {
                  include: { seller: true, category: true },
                },
              },
            },
          },
        },
      },
    });
    if (cart.cartItems.length === 0) {
      throw new HttpException("Shopping cart is empty", 400);
    }
    // Validate inventory and compute totals
    let totalRevenue = 0;
    const sellerPerformance = new Map<
      string,
      {
        seller: IEcommerceSeller.ISummary;
        revenue: number;
        orderCount: number;
        itemCount: number;
      }
    >();
    const categoryPerformance = new Map<
      string,
      {
        category: {
          id: string & tags.Format<"uuid">;
          name: string;
          description: string | null;
          parent_category_id: null;
        };
        revenue: number;
        orderCount: number;
        productCount: number;
      }
    >();
    for (const cartItem of cart.cartItems) {
      if (cartItem.quantity > cartItem.productVariant.quantity) {
        throw new HttpException(
          `Insufficient inventory for ${cartItem.productVariant.sku}`,
          400,
        );
      }
      const unitPrice =
        cartItem.productVariant.price_override ??
        cartItem.productVariant.product.base_price;
      const itemTotal = cartItem.quantity * unitPrice;
      totalRevenue += itemTotal;
      // Update seller performance
      const sellerId = cartItem.productVariant.product.seller.id;
      const sellerData = sellerPerformance.get(sellerId) || {
        seller: {
          id: cartItem.productVariant.product.seller.id as string &
            tags.Format<"uuid">,
          email: cartItem.productVariant.product.seller.email,
          shop_name: cartItem.productVariant.product.seller.shop_name,
          shop_description:
            cartItem.productVariant.product.seller.shop_description,
          logo_image_url: cartItem.productVariant.product.seller.logo_image_url,
          account_status: cartItem.productVariant.product.seller.account_status,
          created_at: toISOStringSafe(
            cartItem.productVariant.product.seller.created_at,
          ) as string & tags.Format<"date-time">,
        } satisfies IEcommerceSeller.ISummary,
        revenue: 0,
        orderCount: 0,
        itemCount: 0,
      };
      sellerData.revenue += itemTotal;
      sellerData.itemCount += cartItem.quantity;
      sellerPerformance.set(sellerId, sellerData);
      // Update category performance
      if (cartItem.productVariant.product.category) {
        const categoryId = cartItem.productVariant.product.category.id;
        const categoryData = categoryPerformance.get(categoryId) || {
          category: {
            id: cartItem.productVariant.product.category.id as string &
              tags.Format<"uuid">,
            name: cartItem.productVariant.product.category.name,
            description:
              cartItem.productVariant.product.category.description ?? null,
            parent_category_id: null,
          },
          revenue: 0,
          orderCount: 0,
          productCount: 1,
        };
        categoryData.revenue += itemTotal;
        categoryData.orderCount++;
        categoryPerformance.set(categoryId, categoryData);
      }
    }
    const orderId = v4() as string & tags.Format<"uuid">;
    // Create order
    const order = await prisma.ecommerce_orders.create({
      data: {
        id: orderId,
        customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Create order items and update inventory
    for (const cartItem of cart.cartItems) {
      const unitPrice =
        cartItem.productVariant.price_override ??
        cartItem.productVariant.product.base_price;
      const totalPrice = cartItem.quantity * unitPrice;
      await prisma.ecommerce_order_items.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          order_id: orderId,
          seller_id: cartItem.productVariant.product.seller.id,
          product_variant_id: cartItem.productVariant.id,
          quantity: cartItem.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          status: "paid",
        },
      });
      await prisma.ecommerce_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_product_variant_id: cartItem.productVariant.id,
          ecommerce_seller_id: cartItem.productVariant.product.seller.id,
          ecommerce_order_id: orderId,
          quantity: -cartItem.quantity,
          reason: "order_placement",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    // Create payment transaction
    await prisma.ecommerce_payment_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_id: orderId,
        customer_id: props.customer.id,
        payment_method: "credit_card",
        amount: totalRevenue,
        currency: "USD",
        gateway_name: "stripe",
        gateway_transaction_id: `txn_${v4().slice(0, 8)}`,
        status: "completed",
        authorization_code: `auth_${v4().slice(0, 8)}`,
        retry_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
        completed_at: new Date(),
        failed_at: null,
        failure_reason: null,
        gateway_response_data: null,
      },
    });
    // Clear shopping cart
    await prisma.ecommerce_shopping_carts.update({
      where: { id: cart.id },
      data: {
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    });
    // Prepare analytics response
    const orderCount = 1;
    const averageOrderValue = totalRevenue / orderCount;
    const currentHour = new Date().getHours();
    return {
      period: currentTimestamp,
      total_revenue: totalRevenue,
      order_count: orderCount as number & tags.Type<"int32">,
      average_order_value: Math.round(averageOrderValue * 100) / 100,
      status_distribution: {
        paid: orderCount as number & tags.Type<"int32">,
        shipped: 0 as number & tags.Type<"int32">,
        delivered: 0 as number & tags.Type<"int32">,
        cancelled: 0 as number & tags.Type<"int32">,
        refunded: 0 as number & tags.Type<"int32">,
      } satisfies IEcommerceOrderSnapshotStatusDistribution,
      seller_performance: Array.from(sellerPerformance.values()).map(
        (sp) =>
          ({
            seller_id: sp.seller.id,
            seller: sp.seller,
            total_revenue: sp.revenue,
            order_count: 1 as number & tags.Type<"int32">,
            average_order_value: sp.revenue,
            item_count: sp.itemCount as number & tags.Type<"int32">,
          }) satisfies IEcommerceOrderSnapshotSellerPerformance,
      ),
      product_category_performance: Array.from(
        categoryPerformance.values(),
      ).map(
        (cp) =>
          ({
            id: cp.category.id,
            name: cp.category.name,
            description: cp.category.description,
            total_revenue: cp.revenue,
            order_count: cp.orderCount as number & tags.Type<"int32">,
            average_order_value: cp.revenue / Math.max(cp.orderCount, 1),
            product_count: cp.productCount as number & tags.Type<"int32">,
            subcategory_count: 0 as number & tags.Type<"int32">,
            parent_category_id: cp.category.parent_category_id,
          }) satisfies IEcommerceOrderSnapshotCategoryPerformance,
      ),
      geographic_distribution: {
        country_distribution:
          [] satisfies IEcommerceOrderSnapshotGeographicDistributionCountry[],
        region_distribution:
          [] satisfies IEcommerceOrderSnapshotGeographicDistributionRegion[],
        city_distribution:
          [] satisfies IEcommerceOrderSnapshotGeographicDistributionCity[],
        top_regions:
          [] satisfies IEcommerceOrderSnapshotGeographicDistributionTopRegion[],
        unknown_locations: null,
      } satisfies IEcommerceOrderSnapshotGeographicDistribution,
      hourly_distribution: [
        {
          hour: currentHour as number &
            tags.Type<"int32"> &
            tags.Minimum<0> &
            tags.Maximum<23>,
          order_count: orderCount as number & tags.Type<"int32">,
          total_revenue: totalRevenue,
          average_order_value: averageOrderValue,
        } satisfies IEcommerceOrderSnapshotHourlyDistribution,
      ],
    } satisfies IEcommerceOrder;
  });
  return result;
}
