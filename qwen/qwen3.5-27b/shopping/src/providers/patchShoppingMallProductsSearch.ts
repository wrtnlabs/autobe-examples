import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsSearch(props: {
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? props.body.limit ?? 20;
  const skip = (page - 1) * pageSize;
  // Build where clause
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Text search filter (case-insensitive partial match)
  if (props.body.search) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Category filter (exact match - subcategories would require recursive query)
  if (props.body.category_id) {
    whereInput.shopping_mall_category_id = props.body.category_id;
  }
  // Price range filter on base_price
  if (
    props.body.min_price !== undefined &&
    props.body.max_price !== undefined
  ) {
    whereInput.base_price = {
      gte: props.body.min_price,
      lte: props.body.max_price,
    };
  } else if (props.body.min_price !== undefined) {
    whereInput.base_price = {
      gte: props.body.min_price,
    };
  } else if (props.body.max_price !== undefined) {
    whereInput.base_price = {
      lte: props.body.max_price,
    };
  }
  // In-stock filter: products with at least one variant having positive total inventory
  if (props.body.in_stock_only === true) {
    whereInput.variants = {
      some: {
        deleted_at: null,
        inventoryRecords: {
          some: {
            quantity_change: {
              gt: 0,
            },
          },
        },
      },
    };
  }
  // Build orderBy clause based on sortBy and sortOrder
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput =
    {};
  const sortBy = props.body.sortBy ?? "relevance";
  const sortOrder = props.body.sortOrder ?? "desc";
  switch (sortBy) {
    case "name":
      orderByInput.name = sortOrder;
      break;
    case "base_price":
      orderByInput.base_price = sortOrder;
      break;
    case "price_asc":
      orderByInput.base_price = "asc";
      break;
    case "price_desc":
      orderByInput.base_price = "desc";
      break;
    case "created_at":
      orderByInput.created_at = sortOrder;
      break;
    case "newest":
      orderByInput.created_at = "desc";
      break;
    case "rating":
      // Rating sorting requires complex aggregation with reviews
      // Default to created_at for now
      orderByInput.created_at = sortOrder;
      break;
    case "relevance":
    default:
      // Default to newest first for relevance
      orderByInput.created_at = "desc";
      break;
  }
  // Execute findMany query with transformer select
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  // Execute count query for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Transform records to DTO format
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallProductAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
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
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallProductsSearch(props: {
//   body: IShoppingMallProduct.IRequest;
// }): Promise<IPageIShoppingMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_products.findMany({
//     ...ShoppingMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------