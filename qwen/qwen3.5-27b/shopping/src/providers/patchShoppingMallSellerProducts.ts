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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  // Apply search filter (case-insensitive partial match on name)
  if (props.body.search !== undefined && props.body.search !== null) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Apply category filter
  if (props.body.category_id !== undefined && props.body.category_id !== null) {
    whereInput.shopping_mall_category_id = props.body.category_id;
  }
  // Apply price range filter (handle all cases without spread operator)
  if (props.body.min_price !== undefined && props.body.min_price !== null) {
    if (props.body.max_price !== undefined && props.body.max_price !== null) {
      whereInput.base_price = {
        gte: props.body.min_price,
        lte: props.body.max_price,
      };
    } else {
      whereInput.base_price = {
        gte: props.body.min_price,
      };
    }
  } else if (
    props.body.max_price !== undefined &&
    props.body.max_price !== null
  ) {
    whereInput.base_price = {
      lte: props.body.max_price,
    };
  }
  // Apply in_stock_only filter
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
  // Build orderBy
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sortBy ?? "relevance";
      const sortOrder = props.body.sortOrder ?? "desc";
      switch (sortBy) {
        case "name":
          return { name: sortOrder };
        case "base_price":
        case "price_asc":
        case "price_desc":
          return {
            base_price:
              sortOrder === "asc" || sortBy === "price_asc" ? "asc" : "desc",
          };
        case "created_at":
        case "newest":
          return {
            created_at: sortBy === "newest" ? "desc" : sortOrder,
          };
        case "rating":
          return { reviews: { _count: sortOrder } };
        case "relevance":
        default:
          return { created_at: "desc" };
      }
    })();
  // Query products
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    ShoppingMallProductAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// export async function patchShoppingMallSellerProducts(props: {
//   seller: SellerPayload;
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