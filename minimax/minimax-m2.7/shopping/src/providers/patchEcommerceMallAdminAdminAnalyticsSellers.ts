import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
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

export async function patchEcommerceMallAdminAdminAnalyticsSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IAnalytic.IRequest;
}): Promise<IPageIEcommerceMallSeller.IAnalytic.ISummary> {
  // Pagination parameters with branded type defaults
  const page =
    props.body.page ??
    (1 as unknown as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limitValue =
    props.body.limit ??
    (20 as unknown as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>);
  const limit = Math.min(limitValue, 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  // Build dynamic WHERE conditions
  const conditions: Prisma.Enumerable<Prisma.ecommerce_mall_sellersWhereInput> =
    [];
  // Filter by approval status
  if (props.body.approvalStatus !== undefined) {
    conditions.push({
      approval_status: props.body.approvalStatus,
    });
  }
  // Filter by date range using ISO string comparisons (Prisma accepts ISO strings for DateTime)
  if (props.body.createdAfter !== undefined) {
    conditions.push({
      created_at: {
        gte: props.body.createdAfter,
      },
    });
  }
  if (props.body.createdBefore !== undefined) {
    conditions.push({
      created_at: {
        lte: props.body.createdBefore,
      },
    });
  }
  // Text search on email and shop_name
  if (props.body.search !== undefined && props.body.search.trim() !== "") {
    const searchTerm = props.body.search.trim();
    conditions.push({
      OR: [
        { email: { contains: searchTerm, mode: "insensitive" } },
        { profile: { name: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }
  // Filter by suspension state via seller_suspensions subquery
  if (props.body.suspensionState !== undefined) {
    if (props.body.suspensionState === "suspended") {
      conditions.push({
        sellerSuspensions: {
          some: {
            restored_at: null,
          },
        },
      });
    } else {
      conditions.push({
        sellerSuspensions: {
          none: {
            restored_at: null,
          },
        },
      });
    }
  }
  // Final WHERE clause
  const whereClause: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
    ...(conditions.length > 0 ? { AND: conditions } : {}),
  };
  // Sort configuration
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  // Fetch sellers with required relations
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: sortOrder },
    select: {
      id: true,
      email: true,
      approval_status: true,
      created_at: true,
      profile: {
        select: {
          name: true,
        },
      },
      products: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
      sellerSuspensions: {
        select: {
          restored_at: true,
        },
      },
    },
  });
  // Get order statistics for sellers
  const sellerIds = sellers.map((s) => s.id);
  const orderStats = await computeOrderStatistics(sellerIds);
  // Transform to response format
  let transformedData: IEcommerceMallSeller.IAnalytic.ISummary[] = sellers.map(
    (seller) => {
      const hasActiveSuspension = seller.sellerSuspensions.some(
        (s) => s.restored_at === null,
      );
      const stats = orderStats.get(seller.id) ?? {
        orderCount: 0,
        totalItemsSold: 0,
        totalRevenue: 0,
      };
      return {
        id: seller.id,
        email: seller.email,
        approvalStatus: typia.assert<"approved" | "pending" | "rejected">(
          seller.approval_status,
        ),
        suspensionStatus: hasActiveSuspension ? "suspended" : "active",
        shopName: seller.profile?.name ?? null,
        productCount: seller.products.length,
        orderCount: stats.orderCount,
        totalItemsSold: stats.totalItemsSold,
        totalRevenue: stats.totalRevenue,
        createdAt: toISOStringSafe(seller.created_at),
      };
    },
  );
  // Sort by aggregate fields if specified (Prisma doesn't support aggregate sorting)
  if (sortField === "total_revenue") {
    transformedData.sort((a, b) =>
      sortOrder === "asc"
        ? a.totalRevenue - b.totalRevenue
        : b.totalRevenue - a.totalRevenue,
    );
  } else if (sortField === "total_orders") {
    transformedData.sort((a, b) =>
      sortOrder === "asc"
        ? a.orderCount - b.orderCount
        : b.orderCount - a.orderCount,
    );
  } else if (sortField === "product_count") {
    transformedData.sort((a, b) =>
      sortOrder === "asc"
        ? a.productCount - b.productCount
        : b.productCount - a.productCount,
    );
  }
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
/**
 * Compute order statistics (orderCount, totalItemsSold, totalRevenue) for sellers.
 * Queries products and order_items tables to aggregate metrics.
 */
async function computeOrderStatistics(sellerIds: string[]): Promise<
  Map<
    string,
    {
      orderCount: number;
      totalItemsSold: number;
      totalRevenue: number;
    }
  >
> {
  const statsMap = new Map<
    string,
    {
      orderCount: number;
      totalItemsSold: number;
      totalRevenue: number;
    }
  >();
  if (sellerIds.length === 0) {
    return statsMap;
  }
  // Get products for all sellers
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: {
      ecommerce_mall_seller_id: {
        in: sellerIds,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
    },
  });
  const productToSeller = new Map(
    products.map((p) => [p.id, p.ecommerce_mall_seller_id]),
  );
  const productIds = products.map((p) => p.id);
  if (productIds.length === 0) {
    // Initialize empty stats for all sellers
    for (const sellerId of sellerIds) {
      statsMap.set(sellerId, {
        orderCount: 0,
        totalItemsSold: 0,
        totalRevenue: 0,
      });
    }
    return statsMap;
  }
  // Get order items for all products with shipped or delivered status
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: {
      ecommerce_mall_product_id: {
        in: productIds,
      },
      status: {
        in: ["shipped", "delivered"],
      },
    },
    select: {
      ecommerce_mall_product_id: true,
      ecommerce_mall_order_id: true,
      quantity: true,
      unit_price: true,
    },
  });
  // Initialize stats for all sellers
  for (const sellerId of sellerIds) {
    statsMap.set(sellerId, {
      orderCount: 0,
      totalItemsSold: 0,
      totalRevenue: 0,
    });
  }
  // Track seen orders per seller for unique order count
  const seenOrders = new Map<string, Set<string>>();
  for (const sellerId of sellerIds) {
    seenOrders.set(sellerId, new Set());
  }
  // Aggregate stats per seller
  for (const item of orderItems) {
    const sellerId = productToSeller.get(item.ecommerce_mall_product_id);
    if (!sellerId || !statsMap.has(sellerId)) {
      continue;
    }
    const stats = statsMap.get(sellerId)!;
    const sellerOrders = seenOrders.get(sellerId)!;
    // Count unique orders
    if (!sellerOrders.has(item.ecommerce_mall_order_id)) {
      stats.orderCount++;
      sellerOrders.add(item.ecommerce_mall_order_id);
    }
    // Sum items sold and revenue
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    stats.totalItemsSold += quantity;
    stats.totalRevenue += quantity * unitPrice;
  }
  return statsMap;
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminAnalyticsSellers(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSeller.IAnalytic.IRequest;
// }): Promise<IPageIEcommerceMallSeller.IAnalytic.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------