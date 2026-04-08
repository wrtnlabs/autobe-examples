import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorOrdersAnalytics(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallOrderAnalytic.IRequest;
}): Promise<IPageIEcommerceMallOrderAnalytic.ISummary> {
  const startDateValue: string | undefined = props.body.start_date;
  const endDateValue: string | undefined = props.body.end_date;
  const startDate: (string & tags.Format<"date-time">) | null =
    startDateValue ?? null;
  const endDate: (string & tags.Format<"date-time">) | null =
    endDateValue ?? null;
  if (startDate !== null && endDate !== null) {
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();
    const diffMs = endDateTime - startDateTime;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      throw new HttpException("Date range cannot exceed 1 year", 400);
    }
  }
  const validStatuses = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partially_completed",
  ];
  const statusFilter: string[] = (props.body.statuses ?? []).filter((status) =>
    validStatuses.includes(status),
  );
  const whereConditions: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ...(startDate !== null && { created_at: { gte: new Date(startDate) } }),
    ...(endDate !== null && { created_at: { lte: new Date(endDate) } }),
    ...(statusFilter.length > 0 && { status: { in: statusFilter } }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  const totalRevenueData =
    await MyGlobal.prisma.ecommerce_mall_orders.aggregate({
      where: whereConditions,
      _sum: { total_price: true },
      _count: { id: true },
    });
  const totalOrderCount: number = totalRevenueData._count.id ?? 0;
  const totalRevenue: number = totalRevenueData._sum.total_price ?? 0;
  const averageOrderValue: number =
    totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0;
  const statusBreakdown: {
    [key: string]: number & tags.Type<"int32">;
  } = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partially_completed: 0,
  };
  for (const status of Object.keys(statusBreakdown)) {
    const statusCount: number =
      await MyGlobal.prisma.ecommerce_mall_orders.count({
        where: {
          ...whereConditions,
          status: status,
        },
      });
    statusBreakdown[status] = statusCount;
  }
  const orderIds = await MyGlobal.prisma.ecommerce_mall_orders
    .findMany({
      where: whereConditions,
      select: { id: true },
    })
    .then((orders) => orders.map((o) => o.id));
  const sellerAggregates =
    await MyGlobal.prisma.ecommerce_mall_order_items.groupBy({
      by: ["seller_id"],
      where: {
        ecommerce_mall_order_id: { in: orderIds },
      },
      _sum: { subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    });
  const topSellerIds = sellerAggregates.map((s) => s.seller_id);
  const topSellersData = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: { id: { in: topSellerIds }, deleted_at: null },
    select: {
      id: true,
      display_name: true,
      email: true,
      approval_status: true,
      is_suspended: true,
      created_at: true,
      rejection_reason: true,
      deleted_at: true,
      updated_at: true,
    },
  });
  const topSellers: IEcommerceMallSeller.ISummary[] = topSellersData.map(
    (seller) =>
      ({
        id: seller.id,
        display_name: seller.display_name,
        approval_status: seller.approval_status,
        is_suspended: seller.is_suspended,
        created_at: toISOStringSafe(seller.created_at),
        email: seller.email,
        rejection_reason: seller.rejection_reason,
        deleted_at:
          seller.deleted_at !== null
            ? toISOStringSafe(seller.deleted_at)
            : null,
        updated_at: toISOStringSafe(seller.updated_at),
      }) satisfies IEcommerceMallSeller.ISummary,
  );
  const productVariantAggregates =
    await MyGlobal.prisma.ecommerce_mall_order_items.groupBy({
      by: ["ecommerce_mall_product_variant_id"],
      where: {
        ecommerce_mall_order_id: { in: orderIds },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    });
  const productVariantIds = productVariantAggregates.map(
    (v) => v.ecommerce_mall_product_variant_id,
  );
  const productVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: { id: { in: productVariantIds }, deleted_at: null },
      select: { id: true, product_id: true },
    });
  const productSalesMap = new Map<
    string,
    {
      unitsSold: number;
      totalRevenue: number;
    }
  >();
  for (const variantAgg of productVariantAggregates) {
    const variant = productVariants.find(
      (v) => v.id === variantAgg.ecommerce_mall_product_variant_id,
    );
    if (variant !== undefined) {
      const productId: string = variant.product_id;
      const existing = productSalesMap.get(productId);
      if (existing !== undefined) {
        const sum = variantAgg._sum;
        existing.unitsSold += sum?.quantity ?? 0;
        existing.totalRevenue += sum?.subtotal ?? 0;
      } else {
        const sum = variantAgg._sum;
        productSalesMap.set(productId, {
          unitsSold: sum?.quantity ?? 0,
          totalRevenue: sum?.subtotal ?? 0,
        });
      }
    }
  }
  const topProductsSorted = Array.from(productSalesMap.entries())
    .sort((a, b) => b[1].unitsSold - a[1].unitsSold)
    .slice(0, 10)
    .map(([id, data]) => ({
      id,
      unitsSold: data.unitsSold,
      totalRevenue: data.totalRevenue,
    }));
  const topProductIds = topProductsSorted.map((p) => p.id);
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: { id: { in: topProductIds }, deleted_at: null },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
      },
      seller: {
        select: {
          id: true,
          display_name: true,
          approval_status: true,
          is_suspended: true,
          created_at: true,
        },
      },
    },
  });
  const topProducts: IEcommerceMallProduct.ISummary[] = products.map(
    (product) =>
      ({
        id: product.id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category: {
          id: product.category.id,
          name: product.category.name,
          description: product.category.description,
          sort_order: 0,
          parent: null,
          created_at: toISOStringSafe(product.category.created_at),
          updated_at: toISOStringSafe(product.category.updated_at),
        } satisfies IEcommerceMallCategory.ISummary,
        seller: {
          id: product.seller.id,
          display_name: product.seller.display_name,
          approval_status: product.seller.approval_status,
          is_suspended: product.seller.is_suspended,
          created_at: toISOStringSafe(product.seller.created_at),
        } satisfies IEcommerceMallSeller.ISummary,
        availability_status: "available" as const,
        has_available_variants: false,
      }) satisfies IEcommerceMallProduct.ISummary,
  );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const validLimit: number = Math.min(Math.max(limit, 1), 100);
  const skip: number = (page - 1) * validLimit;
  const analytics: IEcommerceMallOrderAnalytic.ISummary[] = [
    {
      totalOrderCount: totalOrderCount,
      totalRevenue: totalRevenue,
      averageOrderValue: averageOrderValue,
      statusBreakdown: statusBreakdown,
      topSellers: topSellers,
      topProducts: topProducts,
    },
  ];
  return {
    data: analytics,
    pagination: {
      current: page,
      limit: validLimit,
      records: totalOrderCount,
      pages: Math.ceil(totalOrderCount / validLimit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
// import { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorOrdersAnalytics(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallOrderAnalytic.IRequest;
// }): Promise<IPageIEcommerceMallOrderAnalytic.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------