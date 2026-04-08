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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminAnalyticsProducts(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallProduct.IAnalytic.IRequest;
}): Promise<IPageIEcommerceMallProduct.IAnalytic> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause = buildWhereClause(props.body);
  const counts = await computeCounts(whereClause);
  const priceStats = await computePriceStats(whereClause);
  const categoryDistribution = await computeCategoryDistribution(whereClause);
  const sellerDistribution = await computeSellerDistribution(whereClause);
  const paginatedProducts = await computePaginatedProducts(
    whereClause,
    skip,
    limit,
    props.body.sort,
  );
  const totalCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: whereClause,
  });
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: [
      {
        total_count: counts.total,
        active_count: counts.active,
        deleted_count: counts.deleted,
        average_price: priceStats.avg,
        min_price: priceStats.min,
        max_price: priceStats.max,
        category_distribution: categoryDistribution,
        seller_distribution: sellerDistribution,
        items: paginatedProducts,
        pagination: {
          page: page,
          limit: limit,
          total: totalCount,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        } satisfies IPagination,
      },
    ],
  };
}
function buildWhereClause(
  body: IEcommerceMallProduct.IAnalytic.IRequest,
): Prisma.ecommerce_mall_productsWhereInput {
  const conditions: Prisma.ecommerce_mall_productsWhereInput[] = [];
  if (body.status === "ACTIVE") {
    conditions.push({ deleted_at: null });
  } else if (body.status === "DELETED") {
    conditions.push({ deleted_at: { not: null } });
  }
  if (body.category_id) {
    conditions.push({ ecommerce_mall_category_id: body.category_id });
  }
  if (body.seller_id) {
    conditions.push({ ecommerce_mall_seller_id: body.seller_id });
  }
  if (body.min_price !== undefined) {
    conditions.push({ base_price: { gte: body.min_price } });
  }
  if (body.max_price !== undefined) {
    conditions.push({ base_price: { lte: body.max_price } });
  }
  if (body.created_after) {
    conditions.push({ created_at: { gte: body.created_after } });
  }
  if (body.created_before) {
    conditions.push({ created_at: { lte: body.created_before } });
  }
  if (body.search) {
    conditions.push({ name: { contains: body.search, mode: "insensitive" } });
  }
  return conditions.length === 0 ? {} : { AND: conditions };
}
async function computeCounts(
  whereClause: Prisma.ecommerce_mall_productsWhereInput,
): Promise<{
  total: number;
  active: number;
  deleted: number;
}> {
  const [total, active, deleted] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_products.count({ where: whereClause }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: { ...whereClause, deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_products.count({
      where: { ...whereClause, deleted_at: { not: null } },
    }),
  ]);
  return { total, active, deleted };
}
async function computePriceStats(
  whereClause: Prisma.ecommerce_mall_productsWhereInput,
): Promise<{
  avg: number;
  min: number;
  max: number;
}> {
  const result = await MyGlobal.prisma.ecommerce_mall_products.aggregate({
    where: whereClause,
    _avg: { base_price: true },
    _min: { base_price: true },
    _max: { base_price: true },
  });
  return {
    avg: result._avg.base_price ?? 0,
    min: result._min.base_price ?? 0,
    max: result._max.base_price ?? 0,
  };
}
async function computeCategoryDistribution(
  whereClause: Prisma.ecommerce_mall_productsWhereInput,
): Promise<IEcommerceMallProduct.IAnalytic.ICategoryDistribution[]> {
  const result = await MyGlobal.prisma.ecommerce_mall_products.groupBy({
    by: ["ecommerce_mall_category_id"],
    where: whereClause,
    _count: { id: true },
  });
  if (result.length === 0) return [];
  const categoryIds = result.map((r) => r.ecommerce_mall_category_id);
  const categories = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map<
    string,
    {
      id: string;
      name: string;
    }
  >();
  for (const cat of categories) categoryMap.set(cat.id, cat);
  return result.map((r) => {
    const cat = categoryMap.get(r.ecommerce_mall_category_id);
    return {
      categoryId: r.ecommerce_mall_category_id,
      categoryName: cat?.name ?? "Unknown",
      productCount: r._count.id,
    };
  });
}
async function computeSellerDistribution(
  whereClause: Prisma.ecommerce_mall_productsWhereInput,
): Promise<IEcommerceMallProduct.IAnalytic.ISellerDistribution[]> {
  const result = await MyGlobal.prisma.ecommerce_mall_products.groupBy({
    by: ["ecommerce_mall_seller_id"],
    where: whereClause,
    _count: { id: true },
  });
  if (result.length === 0) return [];
  const sellerIds = result.map((r) => r.ecommerce_mall_seller_id);
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: { id: { in: sellerIds } },
    select: {
      id: true,
      email: true,
      approval_status: true,
      rejection_reason: true,
      rejected_at: true,
      created_at: true,
    },
  });
  const sellerMap = new Map<
    string,
    {
      id: string;
      email: string;
      approval_status: string;
      rejection_reason: string | null;
      rejected_at: string | null;
      created_at: string;
    }
  >();
  for (const seller of sellers) {
    sellerMap.set(seller.id, {
      id: seller.id,
      email: seller.email,
      approval_status: seller.approval_status,
      rejection_reason: seller.rejection_reason,
      rejected_at: seller.rejected_at
        ? toISOStringSafe(seller.rejected_at)
        : null,
      created_at: toISOStringSafe(seller.created_at),
    });
  }
  return result.map((r) => {
    const seller = sellerMap.get(r.ecommerce_mall_seller_id);
    return {
      productCount: r._count.id,
      seller: {
        id: r.ecommerce_mall_seller_id,
        email: typia.assert<string & tags.Format<"email">>(seller?.email ?? ""),
        approvalStatus: seller?.approval_status ?? "pending",
        shopName: null,
        suspensionStatus: "active",
        createdAt: typia.assert<string & tags.Format<"date-time">>(
          seller?.created_at ?? "",
        ),
        rejectedAt: seller?.rejected_at ?? null,
        rejectionReason: seller?.rejection_reason ?? null,
      } satisfies IEcommerceMallSeller.ISummary,
    };
  });
}
async function computePaginatedProducts(
  whereClause: Prisma.ecommerce_mall_productsWhereInput,
  skip: number,
  limit: number,
  sort?: string,
): Promise<IEcommerceMallProduct.ISummary[]> {
  const orderBy = (() => {
    switch (sort) {
      case "name":
        return { name: "desc" as const };
      case "base_price":
        return { base_price: "desc" as const };
      default:
        return { created_at: "desc" as const };
    }
  })();
  const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallProductAtSummaryTransformer.select(),
  });
  return ArrayUtil.asyncMap(
    products,
    EcommerceMallProductAtSummaryTransformer.transform,
  );
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
// export async function patchEcommerceMallSuperAdminAdminAnalyticsProducts(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallProduct.IAnalytic.IRequest;
// }): Promise<IPageIEcommerceMallProduct.IAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------