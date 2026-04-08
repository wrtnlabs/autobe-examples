import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
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

export async function getEcommerceMallSellerCategoriesCategoryIdStats(props: {
  seller: SellerPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategoriesStatistic.IStat> {
  // Verify category exists and is not soft-deleted
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  // Query total product counts (all active products in category)
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      category_id: props.categoryId,
      deleted_at: null,
    },
  });
  // Query active product counts (same as total for now)
  const activeProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      category_id: props.categoryId,
      deleted_at: null,
    },
  });
  // Query order statistics through join chain: orders → order_items → product_variants → products
  const ordersWithCategoryProducts =
    await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
      by: ["id"],
      where: {
        items: {
          some: {
            productVariant: {
              product: {
                category_id: props.categoryId,
                deleted_at: null,
              },
            },
          },
        },
      },
      _count: { id: true },
    });
  // Get unique customer count
  const uniqueCustomers = await MyGlobal.prisma.ecommerce_mall_orders.groupBy({
    by: ["ecommerce_mall_member_id"],
    where: {
      items: {
        some: {
          productVariant: {
            product: {
              category_id: props.categoryId,
              deleted_at: null,
            },
          },
        },
      },
    },
    _count: { ecommerce_mall_member_id: true },
  });
  const totalOrderCount = ordersWithCategoryProducts.reduce(
    (sum, o) => sum + o._count.id,
    0,
  );
  const uniqueCustomerCount = uniqueCustomers.length;
  // Query review statistics for products in this category
  const categoryProductIds =
    await MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: {
        category_id: props.categoryId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const categoryProductIdsList = categoryProductIds.map((p) => p.id);
  const reviewStats = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    where: {
      ecommerce_mall_product_id: {
        in: categoryProductIdsList,
      },
      deleted_at: null,
    },
    _avg: { rating: true },
  });
  // Find last activity timestamp from products and reviews as ISO strings
  const lastProductUpdate =
    await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        category_id: props.categoryId,
        deleted_at: null,
      },
      select: { updated_at: true },
      orderBy: { updated_at: "desc" },
    });
  const lastReviewUpdate =
    await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
      where: {
        ecommerce_mall_product_id: {
          in: categoryProductIdsList,
        },
        deleted_at: null,
      },
      select: { updated_at: true },
      orderBy: { updated_at: "desc" },
    });
  // Convert to ISO strings and find minimum (lexicographic comparison)
  const productIso = lastProductUpdate?.updated_at.toISOString();
  const reviewIso = lastReviewUpdate?.updated_at.toISOString();
  const categoryIso = category.created_at.toISOString();
  const allUpdatedDates: (string & tags.Format<"date-time">)[] = [
    productIso,
    reviewIso,
    categoryIso,
  ].filter((d): d is string & tags.Format<"date-time"> => d !== undefined);
  const lastUpdated = allUpdatedDates.reduce(
    (earliest, current) => (current < earliest ? current : earliest),
    allUpdatedDates[0] ?? categoryIso,
  );
  const averageRating: (number & tags.Minimum<1> & tags.Maximum<5>) | null =
    reviewStats._avg.rating !== undefined ? reviewStats._avg.rating : null;
  return {
    totalProductsCount: totalProducts,
    activeProductCount: activeProducts,
    totalOrderCount,
    uniqueCustomerCount,
    averageRating,
    lastUpdated,
  } satisfies IEcommerceMallCategoriesStatistic.IStat;
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
// import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerCategoriesCategoryIdStats(props: {
//   seller: SellerPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCategoriesStatistic.IStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------