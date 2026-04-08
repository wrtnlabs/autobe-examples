import { IEcommerceProductSalesReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSalesReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellerReportsProducts(props: {
  seller: SellerPayload;
  body: IEcommerceProductSalesReport.IRequest;
}): Promise<IEcommerceProductSalesReport> {
  // Validate pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  // Parse date filters to Date objects for Prisma queries
  const dateFrom = props.body.date_from
    ? new Date(props.body.date_from)
    : undefined;
  const dateTo = props.body.date_to ? new Date(props.body.date_to) : undefined;
  // Build where clause for products (seller-owned with optional filters)
  const productWhere: Prisma.ecommerce_productsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.product_ids && props.body.product_ids.length > 0
      ? { id: { in: props.body.product_ids } }
      : {}),
    ...(props.body.category_ids && props.body.category_ids.length > 0
      ? { category_id: { in: props.body.category_ids } }
      : {}),
    ...(dateFrom || dateTo
      ? {
          OR: [
            ...(dateFrom ? [{ created_at: { gte: dateFrom } }] : []),
            ...(dateTo ? [{ created_at: { lte: dateTo } }] : []),
          ],
        }
      : {}),
  };
  // Build where clause for order items (linked to seller's products with status filter)
  const orderItemWhere: Prisma.ecommerce_order_itemsWhereInput = {
    productVariant: {
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
    },
    ...(props.body.statuses && props.body.statuses.length > 0
      ? { status: { in: props.body.statuses } }
      : {}),
    ...(dateFrom || dateTo
      ? {
          OR: [
            ...(dateFrom ? [{ created_at: { gte: dateFrom } }] : []),
            ...(dateTo ? [{ created_at: { lte: dateTo } }] : []),
          ],
        }
      : {}),
  };
  // Get total product count
  const totalProducts = await MyGlobal.prisma.ecommerce_products.count({
    where: productWhere,
  });
  // Get all order items for aggregation
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: orderItemWhere,
    select: {
      quantity: true,
      unit_price: true,
      productVariant: {
        select: {
          product_id: true,
        },
      },
    },
  });
  const totalSalesCount = orderItems.length;
  const totalRevenue = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );
  const averageOrderValue =
    totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  // Get all variants for seller's products to calculate inventory status
  const variants = await MyGlobal.prisma.ecommerce_product_variants.findMany({
    where: {
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
        ...(props.body.product_ids && props.body.product_ids.length > 0
          ? { id: { in: props.body.product_ids } }
          : {}),
        ...(props.body.category_ids && props.body.category_ids.length > 0
          ? { category_id: { in: props.body.category_ids } }
          : {}),
        ...(dateFrom || dateTo
          ? {
              OR: [
                ...(dateFrom ? [{ created_at: { gte: dateFrom } }] : []),
                ...(dateTo ? [{ created_at: { lte: dateTo } }] : []),
              ],
            }
          : {}),
      },
      deleted_at: null,
    },
    select: {
      id: true,
      product_id: true,
    },
  });
  // Get inventory records for all variants
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_inventory_records.findMany({
      where: {
        ecommerce_product_variant_id: {
          in: variants.map((v) => v.id),
        },
        deleted_at: null,
      },
      select: {
        ecommerce_product_variant_id: true,
        quantity_change: true,
      },
    });
  // Calculate current stock per variant
  const variantStock = new Map<string, number>();
  for (const record of inventoryRecords) {
    const current = variantStock.get(record.ecommerce_product_variant_id) ?? 0;
    variantStock.set(
      record.ecommerce_product_variant_id,
      current + record.quantity_change,
    );
  }
  // Calculate inventory status per product (aggregating across all variants)
  const productVariantStocks = new Map<string, number[]>();
  for (const variant of variants) {
    const stock = variantStock.get(variant.id) ?? 0;
    const stocks = productVariantStocks.get(variant.product_id) ?? [];
    stocks.push(stock);
    productVariantStocks.set(variant.product_id, stocks);
  }
  // Calculate overall inventory status (products, not variants)
  const overallInventoryStatus = {
    in_stock: 0,
    out_of_stock: 0,
    low_stock: 0,
  };
  for (const [productId, stocks] of productVariantStocks.entries()) {
    const hasInStock = stocks.some((s) => s > 10);
    const hasLowStock = stocks.some((s) => s > 0 && s <= 10);
    const allOutOfStock = stocks.every((s) => s === 0);
    if (hasInStock) {
      overallInventoryStatus.in_stock++;
    } else if (allOutOfStock) {
      overallInventoryStatus.out_of_stock++;
    } else if (hasLowStock) {
      overallInventoryStatus.low_stock++;
    }
  }
  // Get products with pagination
  const products = await MyGlobal.prisma.ecommerce_products.findMany({
    where: productWhere,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      category_id: true,
    },
  });
  // Get category names
  const categoryIds = [...new Set(products.map((p) => p.category_id))];
  const categories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  // Calculate per-product metrics
  const productSalesMetrics = new Map<
    string,
    {
      sales_count: number;
      revenue: number;
    }
  >();
  for (const item of orderItems) {
    const productId = item.productVariant.product_id;
    const current = productSalesMetrics.get(productId) ?? {
      sales_count: 0,
      revenue: 0,
    };
    current.sales_count++;
    current.revenue += item.quantity * item.unit_price;
    productSalesMetrics.set(productId, current);
  }
  // Build product breakdown
  const productBreakdowns = await ArrayUtil.asyncMap(
    products,
    async (product) => {
      const metrics = productSalesMetrics.get(product.id) ?? {
        sales_count: 0,
        revenue: 0,
      };
      const stocks = productVariantStocks.get(product.id) ?? [];
      const inventoryStatus = {
        in_stock: stocks.filter((s) => s > 10).length,
        out_of_stock: stocks.filter((s) => s === 0).length,
        low_stock: stocks.filter((s) => s > 0 && s <= 10).length,
      };
      return {
        product_id: product.id,
        product_name: product.name,
        category_id: product.category_id,
        category_name:
          categoryMap.get(product.category_id) ?? "Unknown Category",
        sales_count: metrics.sales_count,
        revenue: metrics.revenue,
        inventory_status: inventoryStatus,
      } satisfies IEcommerceProductSalesReport.IProductBreakdown;
    },
  );
  return {
    total_products: totalProducts,
    total_sales_count: totalSalesCount,
    total_revenue: totalRevenue,
    average_order_value: averageOrderValue,
    inventory_status: overallInventoryStatus,
    products: productBreakdowns,
  } satisfies IEcommerceProductSalesReport;
}
