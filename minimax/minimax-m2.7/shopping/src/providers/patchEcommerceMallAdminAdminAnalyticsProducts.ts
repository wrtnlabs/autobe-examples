import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminAnalyticsProducts(props: {
  admin: AdminPayload;
  body: IEcommerceMallProduct.IAnalytic.IRequest;
}): Promise<IPageIEcommerceMallProduct.IAnalytic> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base WHERE clause from filters
  const whereClause = {
    ...(props.body.category_id && {
      ecommerce_mall_category_id: props.body.category_id,
    }),
    ...(props.body.seller_id && {
      ecommerce_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.status === "ACTIVE" && { deleted_at: null }),
    ...(props.body.status === "DELETED" && { deleted_at: { not: null } }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
    ...(props.body.created_after && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before && {
      created_at: { lte: props.body.created_before },
    }),
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_productsWhereInput;
  // Execute aggregation and data queries in parallel
  const [
    aggregations,
    categoryDistribution,
    sellerDistribution,
    products,
    totalRecords,
    activeCount,
    deletedCount,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.aggregate({
      _count: { id: true },
      _avg: { base_price: true },
      _min: { base_price: true },
      _max: { base_price: true },
      where: whereClause,
    }),
    MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: { where: whereClause },
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: { products: { some: whereClause } },
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        rejected_at: true,
        created_at: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: (() => {
        if (props.body.sort === "name") return { name: "desc" } as const;
        if (props.body.sort === "base_price")
          return { base_price: "desc" } as const;
        return { created_at: "desc" } as const;
      })(),
      ...EcommerceMallProductAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereClause }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: { ...whereClause, deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: { ...whereClause, deleted_at: { not: null } },
    }),
  ]);
  // Transform category distribution
  const categoryDistData: IEcommerceMallProduct.IAnalytic.ICategoryDistribution[] =
    categoryDistribution
      .filter((cat) => cat._count.products > 0)
      .map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        productCount: cat._count.products,
      }));
  // Transform seller distribution
  const sellerDistData: IEcommerceMallProduct.IAnalytic.ISellerDistribution[] =
    sellerDistribution.map((seller) => ({
      productCount: seller._count.products,
      seller: {
        id: seller.id,
        email: seller.email,
        approvalStatus: seller.approval_status,
        rejectionReason: seller.rejection_reason,
        rejectedAt:
          seller.rejected_at !== null
            ? (toISOStringSafe(seller.rejected_at) as string &
                tags.Format<"date-time">)
            : null,
        createdAt: toISOStringSafe(seller.created_at) as string &
          tags.Format<"date-time">,
        suspensionStatus: "active",
      } satisfies IEcommerceMallSeller.ISummary,
    }));
  // Transform products using transformer
  const productItems = await ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
  const totalPages = Math.ceil(totalRecords / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: [
      {
        total_count: aggregations._count.id,
        active_count: activeCount,
        deleted_count: deletedCount,
        average_price: aggregations._avg.base_price ?? 0,
        min_price: aggregations._min.base_price ?? 0,
        max_price: aggregations._max.base_price ?? 0,
        category_distribution: categoryDistData,
        seller_distribution: sellerDistData,
        items: productItems,
        pagination: {
          page: page,
          limit: limit,
          total: totalRecords,
          totalPages: totalPages,
          hasNext: hasNext,
          hasPrev: hasPrev,
        } satisfies IPagination,
      } satisfies IEcommerceMallProduct.IAnalytic,
    ],
  } satisfies IPageIEcommerceMallProduct.IAnalytic;
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminAnalyticsProducts(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallProduct.IAnalytic.IRequest;
// }): Promise<IPageIEcommerceMallProduct.IAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------