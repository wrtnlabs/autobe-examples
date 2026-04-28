import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformProductAtSummaryTransformer } from "../transformers/EcommercePlatformProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerSearch(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformProduct.ISearch;
}): Promise<IPageIEcommercePlatformProduct.ISummary> {
  const limit = props.body.limit ?? 100;
  let whereInput: Prisma.ecommerce_platform_productsWhereInput = {
    deleted_at: null,
    sellerProfile: {
      seller: {
        is_banned: false,
      },
    },
  };
  // Category filter: include specified category and its direct subcategories
  if (props.body.categoryId !== undefined) {
    const subcategories =
      await MyGlobal.prisma.ecommerce_platform_categories.findMany({
        where: {
          parent_ecommerce_platform_category_id: props.body.categoryId,
          deleted_at: null,
        },
        select: { id: true },
      });
    whereInput.ecommerce_platform_category_id = {
      in: [props.body.categoryId, ...subcategories.map((c) => c.id)],
    };
  }
  // Price range filter
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    whereInput.base_price = {
      ...(props.body.minPrice !== undefined && { gte: props.body.minPrice }),
      ...(props.body.maxPrice !== undefined && { lte: props.body.maxPrice }),
    };
  }
  // Sort order (default: newest first)
  const orderByInput: Prisma.ecommerce_platform_productsOrderByWithRelationInput =
    props.body.sortBy === "priceAsc"
      ? { base_price: "asc" as const }
      : props.body.sortBy === "priceDesc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const };
  // Cursor-based pagination
  const cursorInput =
    props.body.cursor !== undefined ? { id: props.body.cursor } : undefined;
  const skipInput = props.body.cursor !== undefined ? 1 : 0;
  // Query products using transformer's select for optimized relation fetching
  const records = await MyGlobal.prisma.ecommerce_platform_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    cursor: cursorInput,
    skip: skipInput,
    take: limit,
    ...EcommercePlatformProductAtSummaryTransformer.select(),
  });
  // inStockOnly filter (application-level since Prisma cannot use SUM in WHERE clauses)
  let filteredRecords = records;
  if (props.body.inStockOnly === true) {
    const variantIds = records.flatMap((p) => p.variants.map((v) => v.id));
    if (variantIds.length > 0) {
      const aggregates =
        await MyGlobal.prisma.ecommerce_platform_inventory_records.groupBy({
          by: ["ecommerce_platform_product_variant_id"],
          where: {
            ecommerce_platform_product_variant_id: { in: variantIds },
            productVariant: { deleted_at: null },
          },
          _sum: { quantity_delta: true },
        });
      const inStockVariantIds = new Set(
        aggregates
          .filter((a) => (a._sum.quantity_delta ?? 0) > 0)
          .map((a) => a.ecommerce_platform_product_variant_id),
      );
      filteredRecords = records.filter((r) =>
        r.variants.some((v) => inStockVariantIds.has(v.id)),
      );
    } else {
      // No active variants exist across returned products - all are unavailable
      filteredRecords = [];
    }
  }
  // Total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_platform_products.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      filteredRecords,
      EcommercePlatformProductAtSummaryTransformer.transform,
    ),
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
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerSearch(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformProduct.ISearch;
// }): Promise<IPageIEcommercePlatformProduct.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_products.findMany({
//     ...EcommercePlatformProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------