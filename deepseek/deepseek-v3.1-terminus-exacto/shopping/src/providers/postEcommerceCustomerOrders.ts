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

export async function postEcommerceCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceOrder;
}): Promise<IEcommerceOrder> {
  // 1. Validate customer and retrieve shopping cart
  const customerId = props.customer.id;
  const shoppingCart = await MyGlobal.prisma.ecommerce_shopping_carts.findFirst(
    {
      where: {
        customer_id: customerId,
        deleted_at: null,
      },
      include: {
        cartItems: {
          where: { deleted_at: null },
          include: {
            productVariant: {
              include: {
                product: {
                  include: {
                    seller: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  );
  if (!shoppingCart) {
    throw new HttpException("Shopping cart not found", 404);
  }
  if (shoppingCart.cartItems.length === 0) {
    throw new HttpException("Shopping cart is empty", 400);
  }
  // 2. Validate stock availability
  for (const cartItem of shoppingCart.cartItems) {
    if (cartItem.quantity > cartItem.productVariant.quantity) {
      throw new HttpException(
        `Insufficient stock for variant ${cartItem.productVariant.sku}. Available: ${cartItem.productVariant.quantity}, Requested: ${cartItem.quantity}`,
        400,
      );
    }
  }
  // 3. Simulate payment processing
  const paymentSuccessful = true; // Assume payment succeeds
  if (!paymentSuccessful) {
    throw new HttpException("Payment processing failed", 500);
  }
  // 4. Calculate order totals and prepare data
  let totalRevenue = 0;
  const orderItemsData: Array<{
    productVariantId: string;
    productId: string;
    sellerId: string;
    categoryId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];
  const sellerPerformanceMap = new Map();
  const categoryPerformanceMap = new Map();
  for (const cartItem of shoppingCart.cartItems) {
    const unitPrice =
      cartItem.productVariant.price_override ??
      cartItem.productVariant.product.base_price;
    const totalPrice = unitPrice * cartItem.quantity;
    totalRevenue += totalPrice;
    const sellerId = cartItem.productVariant.product.ecommerce_seller_id;
    const categoryId = cartItem.productVariant.product.ecommerce_category_id;
    // Track seller performance
    const sellerData = sellerPerformanceMap.get(sellerId) || {
      seller_id: sellerId,
      seller: cartItem.productVariant.product.seller,
      total_revenue: 0,
      order_count: 0,
      item_count: 0,
    };
    sellerData.total_revenue += totalPrice;
    sellerData.item_count += cartItem.quantity;
    sellerPerformanceMap.set(sellerId, sellerData);
    // Track category performance
    const categoryData = categoryPerformanceMap.get(categoryId) || {
      id: categoryId,
      name: cartItem.productVariant.product.category?.name ?? "Unknown",
      description:
        cartItem.productVariant.product.category?.description ?? null,
      total_revenue: 0,
      order_count: 0,
      product_count: 0,
      subcategory_count: 0,
      parent_category_id:
        cartItem.productVariant.product.category?.parent_category_id ?? null,
    };
    categoryData.total_revenue += totalPrice;
    categoryData.product_count++;
    categoryPerformanceMap.set(categoryId, categoryData);
    orderItemsData.push({
      productVariantId: cartItem.product_variant_id,
      productId: cartItem.product_id,
      sellerId,
      categoryId,
      quantity: cartItem.quantity,
      unitPrice,
      totalPrice,
    });
  }
  const orderCount = 1;
  const averageOrderValue = totalRevenue / orderCount;
  const now = new Date();
  const nowISO = toISOStringSafe(now);
  const hour = Number(nowISO.split("T")[1].split(":")[0]);
  // 5. Create order in transaction
  const result = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create order
    const orderId = v4();
    const order = await prisma.ecommerce_orders.create({
      data: {
        id: orderId,
        customer_id: customerId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    // Create order items and update inventory
    for (const itemData of orderItemsData) {
      const orderItemId = v4();
      // Create order item
      await prisma.ecommerce_order_items.create({
        data: {
          id: orderItemId,
          order_id: orderId,
          seller_id: itemData.sellerId,
          product_variant_id: itemData.productVariantId,
          quantity: itemData.quantity,
          unit_price: itemData.unitPrice,
          total_price: itemData.totalPrice,
          status: "paid",
        },
      });
      // Update inventory
      await prisma.ecommerce_product_variants.update({
        where: { id: itemData.productVariantId },
        data: {
          quantity: {
            decrement: itemData.quantity,
          },
          updated_at: now,
        },
      });
    }
    // Clear shopping cart
    await prisma.ecommerce_shopping_carts.update({
      where: { id: shoppingCart.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    // Clear cart items
    await prisma.ecommerce_cart_items.updateMany({
      where: { shopping_cart_id: shoppingCart.id },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    return { orderId };
  });
  // 6. Construct seller performance array
  const sellerPerformance: IEcommerceOrderSnapshotSellerPerformance[] =
    Array.from(sellerPerformanceMap.values()).map(
      (sellerData) =>
        ({
          seller_id: sellerData.seller_id as string & tags.Format<"uuid">,
          seller: {
            id: sellerData.seller.id as string & tags.Format<"uuid">,
            email: sellerData.seller.email as string & tags.Format<"email">,
            shop_name: sellerData.seller.shop_name,
            shop_description: sellerData.seller.shop_description ?? null,
            logo_image_url: sellerData.seller.logo_image_url ?? null,
            account_status: sellerData.seller.account_status,
            created_at: toISOStringSafe(
              sellerData.seller.created_at,
            ) as string & tags.Format<"date-time">,
          } satisfies IEcommerceSeller.ISummary,
          total_revenue: sellerData.total_revenue,
          order_count: orderCount,
          average_order_value: sellerData.total_revenue / orderCount,
          item_count: sellerData.item_count,
        }) satisfies IEcommerceOrderSnapshotSellerPerformance,
    );
  // 7. Construct category performance array
  const productCategoryPerformance: IEcommerceOrderSnapshotCategoryPerformance[] =
    Array.from(categoryPerformanceMap.values()).map(
      (categoryData) =>
        ({
          id: categoryData.id as string & tags.Format<"uuid">,
          name: categoryData.name,
          description: categoryData.description ?? undefined,
          total_revenue: categoryData.total_revenue,
          order_count: orderCount,
          average_order_value: categoryData.total_revenue / orderCount,
          product_count: categoryData.product_count,
          subcategory_count: categoryData.subcategory_count,
          parent_category_id: categoryData.parent_category_id as
            | (string & tags.Format<"uuid">)
            | null,
        }) satisfies IEcommerceOrderSnapshotCategoryPerformance,
    );
  // 8. Construct geographic distribution (simplified)
  const countryCode = "US";
  const countryName = "United States";
  const percentageOfTotal = 100;
  const countryDistribution: IEcommerceOrderSnapshotGeographicDistributionCountry[] =
    [
      {
        country_code: countryCode as string,
        country_name: countryName,
        order_count: orderCount,
        total_revenue: totalRevenue,
        average_order_value: averageOrderValue,
        percentage_of_total: percentageOfTotal,
      },
    ];
  // 9. Construct response
  const response: IEcommerceOrder = {
    period: nowISO as string & tags.Format<"date-time">,
    total_revenue: totalRevenue,
    order_count: orderCount as number & tags.Type<"int32">,
    average_order_value: averageOrderValue,
    status_distribution: {
      paid: shoppingCart.cartItems.length as number & tags.Type<"int32">,
      shipped: 0 as number & tags.Type<"int32">,
      delivered: 0 as number & tags.Type<"int32">,
      cancelled: 0 as number & tags.Type<"int32">,
      refunded: 0 as number & tags.Type<"int32">,
    } satisfies IEcommerceOrderSnapshotStatusDistribution,
    seller_performance: sellerPerformance,
    product_category_performance: productCategoryPerformance,
    geographic_distribution: {
      country_distribution: countryDistribution,
      region_distribution: [],
      city_distribution: [],
      top_regions: [],
      unknown_locations: null,
    } satisfies IEcommerceOrderSnapshotGeographicDistribution,
    hourly_distribution: [
      {
        hour: hour as number &
          tags.Type<"int32"> &
          tags.Minimum<0> &
          tags.Maximum<23>,
        order_count: orderCount as number & tags.Type<"int32">,
        total_revenue: totalRevenue,
        average_order_value: averageOrderValue,
      } satisfies IEcommerceOrderSnapshotHourlyDistribution,
    ],
  };
  return response;
}
