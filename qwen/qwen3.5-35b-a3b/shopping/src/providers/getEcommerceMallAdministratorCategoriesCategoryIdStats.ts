import { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallAdministratorCategoriesCategoryIdStats(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategoriesStatistic.IStat> {
  const { categoryId } = props;
  // Verify category exists and is not soft-deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: categoryId,
      deleted_at: null,
    },
  });
  if (category === null) {
    throw new HttpException("Category not found", 404);
  }
  // Count active products in category
  const totalProductsCount =
    await MyGlobal.prisma.ecommerce_mall_products.count({
      where: {
        category_id: categoryId,
        deleted_at: null,
      },
    });
  // Count active products (same as total in current implementation)
  const activeProductCount = totalProductsCount;
  // Count unique orders containing products from this category via relation chain
  const distinctOrders =
    await MyGlobal.prisma.ecommerce_mall_order_items.groupBy({
      by: ["ecommerce_mall_order_id"],
      where: {
        productVariant: {
          product: {
            category_id: categoryId,
          },
        },
      },
    });
  const totalOrderCount = distinctOrders.length;
  // Count unique customers who ordered from this category
  const distinctCustomers = await MyGlobal.prisma.ecommerce_mall_orders.groupBy(
    {
      by: ["ecommerce_mall_member_id"],
      where: {
        items: {
          some: {
            productVariant: {
              product: {
                category_id: categoryId,
              },
            },
          },
        },
      },
    },
  );
  const uniqueCustomerCount = distinctCustomers.length;
  // Calculate average rating from reviews for products in this category
  const avgRating = await MyGlobal.prisma.ecommerce_mall_reviews.aggregate({
    _avg: { rating: true },
    where: {
      product: {
        category_id: categoryId,
      },
    },
  });
  const averageRating: (number & tags.Minimum<1> & tags.Maximum<5>) | null =
    avgRating._avg.rating ?? null;
  // Find last updated timestamp from products and reviews
  const productLastUpdate =
    await MyGlobal.prisma.ecommerce_mall_products.findFirst({
      where: {
        category_id: categoryId,
        deleted_at: null,
      },
      select: { updated_at: true },
      orderBy: { updated_at: "desc" },
    });
  const reviewLastUpdate =
    await MyGlobal.prisma.ecommerce_mall_reviews.findFirst({
      where: {
        product: {
          category_id: categoryId,
        },
      },
      select: { created_at: true },
      orderBy: { created_at: "desc" },
    });
  const lastUpdatedDate =
    productLastUpdate && reviewLastUpdate
      ? productLastUpdate.updated_at > reviewLastUpdate.created_at
        ? productLastUpdate.updated_at
        : reviewLastUpdate.created_at
      : (productLastUpdate?.updated_at ??
        reviewLastUpdate?.created_at ??
        new Date("1970-01-01"));
  return {
    totalProductsCount,
    activeProductCount,
    totalOrderCount,
    uniqueCustomerCount,
    averageRating,
    lastUpdated: toISOStringSafe(lastUpdatedDate),
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
// export async function getEcommerceMallAdministratorCategoriesCategoryIdStats(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCategoriesStatistic.IStat> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------