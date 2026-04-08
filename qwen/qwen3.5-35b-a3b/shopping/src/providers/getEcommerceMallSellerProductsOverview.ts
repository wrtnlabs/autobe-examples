import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import { IEcommerceMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverview";
import { IEcommerceMallProductOverviewRecentProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewRecentProduct";
import { IEcommerceMallProductOverviewSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewSeller";
import { IEcommerceMallProductOverviewStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewStatusBreakdown";
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

export async function getEcommerceMallSellerProductsOverview(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallProductOverview> {
  const allProducts = await MyGlobal.prisma.ecommerce_mall_products.findMany({
    where: {},
    select: {
      id: true,
      deleted_at: true,
      category_id: true,
      seller_id: true,
      created_at: true,
    },
  });
  const activeProductCount = allProducts.filter(
    (p) => p.deleted_at === null,
  ).length;
  const deletedProductCount = allProducts.filter(
    (p) => p.deleted_at !== null,
  ).length;
  const activeProductsByCategory =
    await MyGlobal.prisma.ecommerce_mall_products.groupBy({
      by: ["category_id"],
      where: {
        deleted_at: null,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });
  const activeProductsBySeller =
    await MyGlobal.prisma.ecommerce_mall_products.groupBy({
      by: ["seller_id"],
      where: {
        deleted_at: null,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });
  const totalCategoriesWithProducts = activeProductsByCategory.length;
  const reviewStats =
    await MyGlobal.prisma.ecommerce_mall_product_review_stats.findMany({
      where: {
        average_rating: {
          not: null,
        },
      },
      select: {
        average_rating: true,
        review_count: true,
      },
    });
  const averageRating =
    reviewStats.length > 0
      ? Number(
          (
            reviewStats.reduce(
              (sum, s) => sum + Number(s.average_rating ?? 0),
              0,
            ) / reviewStats.length
          ).toFixed(2),
        )
      : null;
  const totalReviews = reviewStats.reduce(
    (sum, s) => sum + Number(s.review_count),
    0,
  );
  const recentProducts = await MyGlobal.prisma.ecommerce_mall_products.findMany(
    {
      where: {},
      take: 10,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        name: true,
        category_id: true,
        base_price: true,
        created_at: true,
      },
    },
  );
  const productsByCategoryData = await ArrayUtil.asyncMap(
    activeProductsByCategory,
    async (category) => {
      const categoryData =
        await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
          where: {
            id: category.category_id,
          },
          select: {
            id: true,
            name: true,
          },
        });
      return {
        category_id: category.category_id,
        name: categoryData?.name ?? "Unknown",
        product_count: Number(category._count.id),
      } satisfies IEcommerceMallCategoriesStatistic;
    },
  );
  const productsBySellerData = await ArrayUtil.asyncMap(
    activeProductsBySeller,
    async (seller) => {
      const sellerData = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst(
        {
          where: {
            id: seller.seller_id,
          },
          select: {
            id: true,
            display_name: true,
          },
        },
      );
      return {
        seller_id: seller.seller_id,
        display_name: sellerData?.display_name ?? "Unknown",
        product_count: Number(seller._count.id),
      } satisfies IEcommerceMallProductOverviewSeller;
    },
  );
  const recentProductsData = await ArrayUtil.asyncMap(
    recentProducts,
    async (product) => {
      return {
        id: product.id,
        name: product.name,
        category_id: product.category_id,
        base_price: Number(product.base_price),
        created_at: toISOStringSafe(product.created_at),
      } satisfies IEcommerceMallProductOverviewRecentProduct;
    },
  );
  return {
    totalProducts: activeProductCount,
    deletedProducts: deletedProductCount,
    totalCategoriesWithProducts: totalCategoriesWithProducts,
    averageRating: averageRating,
    totalReviews: totalReviews,
    productsByCategory: productsByCategoryData,
    productsBySeller: productsBySellerData,
    recentProducts: recentProductsData,
    statusBreakdown: {
      active: activeProductCount,
      deleted: deletedProductCount,
    } satisfies IEcommerceMallProductOverviewStatusBreakdown,
  } satisfies IEcommerceMallProductOverview;
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
// import { IEcommerceMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverview";
// import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
// import { IEcommerceMallProductOverviewSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewSeller";
// import { IEcommerceMallProductOverviewRecentProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewRecentProduct";
// import { IEcommerceMallProductOverviewStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewStatusBreakdown";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerProductsOverview(props: {
//   seller: SellerPayload;
// }): Promise<IEcommerceMallProductOverview> {
//   return {
//     totalProducts: ...,
//     deletedProducts: ...,
//     totalCategoriesWithProducts: ...,
//     averageRating: ...,
//     totalReviews: ...,
//     productsByCategory: await ArrayUtil.asyncMap(..., (r) => EcommerceMallCategoriesStatisticTransformer.transform(r)),
//     productsBySeller: await ArrayUtil.asyncMap(..., (r) => EcommerceMallProductOverviewSellerTransformer.transform(r)),
//     recentProducts: await ArrayUtil.asyncMap(..., (r) => EcommerceMallProductOverviewRecentProductTransformer.transform(r)),
//     statusBreakdown: await EcommerceMallProductOverviewStatusBreakdownTransformer.transform(...),
//   };
// }
// ```
//--------------------------------------------------------------