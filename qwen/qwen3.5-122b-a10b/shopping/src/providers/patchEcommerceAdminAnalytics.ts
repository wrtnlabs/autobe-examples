import { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAnalytics(props: {
  admin: AdminPayload;
  body: IEcommerceAnalytic.IRequest;
}): Promise<IPageIEcommerceAnalytic.IResult> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate date range if both provided
  if (props.body.start_date && props.body.end_date) {
    const startDate = new Date(props.body.start_date);
    const endDate = new Date(props.body.end_date);
    if (startDate > endDate) {
      throw new HttpException(
        "start_date must be before or equal to end_date",
        400,
      );
    }
  }
  // Build base where clause for orders
  const orderWhere: Prisma.ecommerce_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.start_date && {
      created_at: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date && {
      updated_at: {
        lte: new Date(props.body.end_date),
      },
    }),
    ...(props.body.order_statuses &&
      props.body.order_statuses.length > 0 && {
        status: {
          in: props.body.order_statuses,
        },
      }),
  };
  // Collect order IDs that match all filters
  let filteredOrderIds: string[] = [];
  // Apply category filter via products join
  if (props.body.category_ids && props.body.category_ids.length > 0) {
    const productsInCategories =
      await MyGlobal.prisma.ecommerce_products.findMany({
        where: {
          category_id: {
            in: props.body.category_ids,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const productIds = productsInCategories.map((p) => p.id);
    if (productIds.length > 0) {
      const variantIds =
        await MyGlobal.prisma.ecommerce_product_variants.findMany({
          where: {
            product_id: {
              in: productIds,
            },
            deleted_at: null,
          },
          select: { id: true },
        });
      const variantIdsArray = variantIds.map((v) => v.id);
      if (variantIdsArray.length > 0) {
        const orderItemsWithProducts =
          await MyGlobal.prisma.ecommerce_order_items.findMany({
            where: {
              ecommerce_product_variant_id: {
                in: variantIdsArray,
              },
              deleted_at: null,
            },
            select: { ecommerce_order_id: true },
          });
        filteredOrderIds.push(
          ...orderItemsWithProducts.map((oi) => oi.ecommerce_order_id),
        );
      }
    }
  }
  // Apply seller filter via products join
  if (props.body.seller_ids && props.body.seller_ids.length > 0) {
    const productsFromSellers =
      await MyGlobal.prisma.ecommerce_products.findMany({
        where: {
          seller_id: {
            in: props.body.seller_ids,
          },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const productIds = productsFromSellers.map((p) => p.id);
    if (productIds.length > 0) {
      const variantIds =
        await MyGlobal.prisma.ecommerce_product_variants.findMany({
          where: {
            product_id: {
              in: productIds,
            },
            deleted_at: null,
          },
          select: { id: true },
        });
      const variantIdsArray = variantIds.map((v) => v.id);
      if (variantIdsArray.length > 0) {
        const orderItemsWithProducts =
          await MyGlobal.prisma.ecommerce_order_items.findMany({
            where: {
              ecommerce_product_variant_id: {
                in: variantIdsArray,
              },
              deleted_at: null,
            },
            select: { ecommerce_order_id: true },
          });
        filteredOrderIds.push(
          ...orderItemsWithProducts.map((oi) => oi.ecommerce_order_id),
        );
      }
    }
  }
  // Apply order item status filter
  if (
    props.body.order_item_statuses &&
    props.body.order_item_statuses.length > 0
  ) {
    const orderItemsWithStatus =
      await MyGlobal.prisma.ecommerce_order_items.findMany({
        where: {
          status: {
            in: props.body.order_item_statuses,
          },
          deleted_at: null,
        },
        select: { ecommerce_order_id: true },
      });
    filteredOrderIds.push(
      ...orderItemsWithStatus.map((oi) => oi.ecommerce_order_id),
    );
  }
  // Apply product variant filter
  if (
    props.body.product_variant_ids &&
    props.body.product_variant_ids.length > 0
  ) {
    const orderItemsWithVariants =
      await MyGlobal.prisma.ecommerce_order_items.findMany({
        where: {
          ecommerce_product_variant_id: {
            in: props.body.product_variant_ids,
          },
          deleted_at: null,
        },
        select: { ecommerce_order_id: true },
      });
    filteredOrderIds.push(
      ...orderItemsWithVariants.map((oi) => oi.ecommerce_order_id),
    );
  }
  // Intersect all order IDs if multiple filters applied
  if (filteredOrderIds.length > 0) {
    const uniqueOrderIds = [...new Set(filteredOrderIds)];
    orderWhere.id = {
      in: uniqueOrderIds,
    };
  }
  // Calculate order metrics
  const [totalOrderCount, totalRevenue] = await Promise.all([
    MyGlobal.prisma.ecommerce_orders.count({ where: orderWhere }),
    MyGlobal.prisma.ecommerce_orders.aggregate({
      where: orderWhere,
      _sum: { total_price: true },
    }),
  ]);
  const totalRevenueValue = totalRevenue._sum.total_price ?? 0;
  const averageOrderValue =
    totalOrderCount > 0 ? totalRevenueValue / totalOrderCount : 0;
  // Calculate status breakdown
  const statusBreakdownRaw = await MyGlobal.prisma.ecommerce_orders.groupBy({
    by: ["status"],
    where: orderWhere,
    _count: { status: true },
  });
  const statusBreakdown: IEcommerceAnalytic.IStatusCount[] =
    statusBreakdownRaw.map(
      (item) =>
        ({
          status: item.status,
          count: item._count.status,
        }) satisfies IEcommerceAnalytic.IStatusCount,
    );
  // Calculate category performance
  const categoryPerformance: IEcommerceAnalytic.ICategoryMetric[] = [];
  if (totalOrderCount > 0) {
    const orders = await MyGlobal.prisma.ecommerce_orders.findMany({
      where: orderWhere,
      select: { id: true },
      skip,
      take: limit,
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
        where: {
          ecommerce_order_id: {
            in: orderIds,
          },
          deleted_at: null,
        },
        include: {
          productVariant: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });
      const categoryMap = new Map<
        string,
        {
          name: string;
          revenue: number;
          orderCount: Set<string>;
        }
      >();
      for (const item of orderItems) {
        const category = item.productVariant.product.category;
        if (category) {
          const existing = categoryMap.get(category.id) ?? {
            name: category.name,
            revenue: 0,
            orderCount: new Set(),
          };
          existing.revenue += item.unit_price * item.quantity;
          existing.orderCount.add(item.ecommerce_order_id);
          categoryMap.set(category.id, existing);
        }
      }
      for (const [categoryId, data] of categoryMap.entries()) {
        categoryPerformance.push({
          category_id: categoryId as string & tags.Format<"uuid">,
          category_name: data.name,
          total_revenue: data.revenue,
          order_count: data.orderCount.size,
        } satisfies IEcommerceAnalytic.ICategoryMetric);
      }
    }
  }
  // Calculate top products
  const topProducts: IEcommerceAnalytic.IProductMetric[] = [];
  if (totalOrderCount > 0) {
    const orders = await MyGlobal.prisma.ecommerce_orders.findMany({
      where: orderWhere,
      select: { id: true },
      take: 1000,
    });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
        where: {
          ecommerce_order_id: {
            in: orderIds,
          },
          deleted_at: null,
        },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      });
      const productMap = new Map<
        string,
        {
          name: string;
          revenue: number;
          orderCount: Set<string>;
        }
      >();
      for (const item of orderItems) {
        const product = item.productVariant.product;
        const existing = productMap.get(product.id) ?? {
          name: product.name,
          revenue: 0,
          orderCount: new Set(),
        };
        existing.revenue += item.unit_price * item.quantity;
        existing.orderCount.add(item.ecommerce_order_id);
        productMap.set(product.id, existing);
      }
      const sortedProducts = Array.from(productMap.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);
      for (const [productId, data] of sortedProducts) {
        topProducts.push({
          id: productId as string & tags.Format<"uuid">,
          name: data.name,
          total_revenue: data.revenue,
          order_count: data.orderCount.size,
        } satisfies IEcommerceAnalytic.IProductMetric);
      }
    }
  }
  // Calculate customer metrics
  const customerWhere: Prisma.ecommerce_ordersWhereInput = { ...orderWhere };
  let totalCustomers = 0;
  let newCustomers = 0;
  let repeatCustomers = 0;
  if (totalOrderCount > 0) {
    const orders = await MyGlobal.prisma.ecommerce_orders.findMany({
      where: customerWhere,
      select: {
        ecommerce_customer_id: true,
        created_at: true,
      },
    });
    const customerOrderMap = new Map<
      string,
      {
        count: number;
        firstOrderDate: Date | null;
      }
    >();
    for (const order of orders) {
      const existing = customerOrderMap.get(order.ecommerce_customer_id) ?? {
        count: 0,
        firstOrderDate: null,
      };
      existing.count += 1;
      if (
        !existing.firstOrderDate ||
        order.created_at < existing.firstOrderDate
      ) {
        existing.firstOrderDate = order.created_at;
      }
      customerOrderMap.set(order.ecommerce_customer_id, existing);
    }
    totalCustomers = customerOrderMap.size;
    repeatCustomers = Array.from(customerOrderMap.values()).filter(
      (data) => data.count > 1,
    ).length;
    if (props.body.start_date) {
      const startDate = new Date(props.body.start_date);
      newCustomers = Array.from(customerOrderMap.values()).filter(
        (data) => data.firstOrderDate && data.firstOrderDate >= startDate,
      ).length;
    } else {
      newCustomers = totalCustomers;
    }
  }
  // Calculate inventory metrics
  const inventoryWhere: Prisma.ecommerce_inventory_recordsWhereInput = {
    deleted_at: null,
  };
  if (props.body.seller_ids && props.body.seller_ids.length > 0) {
    const productVariantsFromSellers =
      await MyGlobal.prisma.ecommerce_product_variants.findMany({
        where: {
          product: {
            seller_id: {
              in: props.body.seller_ids,
            },
            deleted_at: null,
          },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (productVariantsFromSellers.length > 0) {
      inventoryWhere.ecommerce_product_variant_id = {
        in: productVariantsFromSellers.map((v) => v.id),
      };
    }
  }
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_inventory_records.findMany({
      where: inventoryWhere,
      select: { ecommerce_product_variant_id: true, quantity_change: true },
    });
  const variantStockMap = new Map<string, number>();
  for (const record of inventoryRecords) {
    const current =
      variantStockMap.get(record.ecommerce_product_variant_id) ?? 0;
    variantStockMap.set(
      record.ecommerce_product_variant_id,
      current + record.quantity_change,
    );
  }
  const totalVariants = variantStockMap.size;
  const outOfStockCount = [...variantStockMap.values()].filter(
    (stock) => stock === 0,
  ).length;
  const lowStockCount = [...variantStockMap.values()].filter(
    (stock) => stock > 0 && stock < 10,
  ).length;
  const result: IEcommerceAnalytic.IResult = {
    order_metrics: {
      total_count: totalOrderCount,
      total_revenue: totalRevenueValue,
      average_order_value: averageOrderValue,
    },
    status_breakdown: statusBreakdown,
    category_performance: categoryPerformance,
    top_products: topProducts,
    customer_metrics: {
      new_customers: newCustomers,
      repeat_customers: repeatCustomers,
      total_customers: totalCustomers,
    },
    inventory_metrics: {
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_variants: totalVariants,
    },
  } satisfies IEcommerceAnalytic.IResult;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [result],
  } satisfies IPageIEcommerceAnalytic.IResult;
}
