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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminAnalyticsSellers(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallSeller.IAnalytic.IRequest;
}): Promise<IPageIEcommerceMallSeller.IAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build date range filter using string comparison
  const dateFilter: {
    gte?: string;
    lte?: string;
  } = {};
  if (props.body.createdAfter) {
    dateFilter.gte = props.body.createdAfter;
  }
  if (props.body.createdBefore) {
    dateFilter.lte = props.body.createdBefore;
  }
  // Build where clause with filters
  const whereClause = {
    deleted_at: null,
    ...(props.body.approvalStatus && {
      approval_status: props.body.approvalStatus,
    }),
    ...(Object.keys(dateFilter).length > 0 && {
      created_at: dateFilter,
    }),
    ...(props.body.search && {
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          profile: {
            name: { contains: props.body.search, mode: "insensitive" as const },
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_sellersWhereInput;
  // Determine sort field
  const sortField = props.body.sort ?? "created_at";
  const orderDirection = props.body.order ?? "desc";
  // Fetch sellers with basic data
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: whereClause,
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
      _count: {
        select: {
          products: {
            where: {
              deleted_at: null,
            },
          },
        },
      },
    },
    skip,
    take: limit,
    orderBy:
      sortField === "created_at"
        ? ({
            created_at: orderDirection,
          } satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput)
        : undefined,
  });
  const sellerIds = sellers.map((s) => s.id);
  // Fetch suspension status for all sellers
  const suspensions =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
      where: {
        ecommerce_mall_seller_id: { in: sellerIds },
        restored_at: null,
      },
      select: {
        ecommerce_mall_seller_id: true,
      },
    });
  const suspendedSellerIds = new Set(
    suspensions.map((s) => s.ecommerce_mall_seller_id),
  );
  // Get products for these sellers
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: {
      ecommerce_mall_seller_id: { in: sellerIds },
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
  // Fetch order items for all products
  const orderItems =
    productIds.length > 0
      ? await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
          where: {
            ecommerce_mall_product_id: { in: productIds },
            status: { in: ["shipped", "delivered"] },
          },
          select: {
            ecommerce_mall_product_id: true,
            ecommerce_mall_order_id: true,
            quantity: true,
            unit_price: true,
          },
        })
      : [];
  // Aggregate order stats by seller
  const sellerOrderStats = new Map<
    string,
    {
      orderCount: number;
      totalItemsSold: number;
      totalRevenue: number;
    }
  >();
  const sellerOrderCountMap = new Map<string, Set<string>>();
  for (const item of orderItems) {
    const sellerId = productToSeller.get(item.ecommerce_mall_product_id);
    if (!sellerId) continue;
    if (!sellerOrderStats.has(sellerId)) {
      sellerOrderStats.set(sellerId, {
        orderCount: 0,
        totalItemsSold: 0,
        totalRevenue: 0,
      });
    }
    if (!sellerOrderCountMap.has(sellerId)) {
      sellerOrderCountMap.set(sellerId, new Set());
    }
    const stats = sellerOrderStats.get(sellerId)!;
    stats.totalItemsSold += item.quantity;
    stats.totalRevenue += item.quantity * item.unit_price;
    sellerOrderCountMap.get(sellerId)!.add(item.ecommerce_mall_order_id);
  }
  // Finalize order count
  for (const [sellerId] of sellerOrderCountMap) {
    const stats = sellerOrderStats.get(sellerId);
    if (stats) {
      stats.orderCount = sellerOrderCountMap.get(sellerId)!.size;
    }
  }
  // Build result data
  let data = sellers.map((seller) => {
    const stats = sellerOrderStats.get(seller.id) ?? {
      orderCount: 0,
      totalItemsSold: 0,
      totalRevenue: 0,
    };
    const orderCount = sellerOrderCountMap.get(seller.id)?.size ?? 0;
    return {
      id: seller.id,
      email: seller.email,
      approvalStatus: typia.assert<"approved" | "pending" | "rejected">(
        seller.approval_status,
      ),
      suspensionStatus: suspendedSellerIds.has(seller.id)
        ? "suspended"
        : "active",
      shopName: seller.profile?.name ?? null,
      productCount: seller._count.products,
      orderCount: orderCount,
      totalItemsSold: stats.totalItemsSold,
      totalRevenue: stats.totalRevenue,
      createdAt: toISOStringSafe(seller.created_at),
    } satisfies IEcommerceMallSeller.IAnalytic.ISummary;
  });
  // Apply sorting if not by created_at (DB already sorted)
  if (sortField !== "created_at") {
    data = data.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (sortField) {
        case "total_revenue":
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case "total_orders":
          aVal = a.orderCount;
          bVal = b.orderCount;
          break;
        case "product_count":
          aVal = a.productCount;
          bVal = b.productCount;
          break;
        default:
          aVal = a.createdAt.localeCompare(b.createdAt);
          bVal = b.createdAt.localeCompare(a.createdAt);
      }
      return orderDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }
  // Apply suspension state filter
  if (props.body.suspensionState) {
    if (props.body.suspensionState === "suspended") {
      data = data.filter((seller) => seller.suspensionStatus === "suspended");
    } else {
      data = data.filter((seller) => seller.suspensionStatus === "active");
    }
  }
  // Get total count for pagination (sequential await)
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallSeller.IAnalytic.ISummary;
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
// export async function patchEcommerceMallSuperAdminAdminAnalyticsSellers(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallSeller.IAnalytic.IRequest;
// }): Promise<IPageIEcommerceMallSeller.IAnalytic.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------