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

export async function patchShoppingMallCategoriesCategoryIdProducts(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    shopping_mall_category_id: props.categoryId,
  };
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.min_price !== undefined && props.body.min_price !== null) {
    whereInput.base_price = {
      gte: props.body.min_price,
    };
  }
  if (props.body.max_price !== undefined && props.body.max_price !== null) {
    whereInput.base_price = {
      lte: props.body.max_price,
    };
  }
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
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sortBy !== undefined && props.body.sortBy !== null) {
    const sortOrder = props.body.sortOrder ?? "desc";
    switch (props.body.sortBy) {
      case "name":
        orderByInput.name = sortOrder;
        break;
      case "base_price":
        orderByInput.base_price = sortOrder;
        break;
      case "created_at":
        orderByInput.created_at = sortOrder;
        break;
      case "rating":
      case "newest":
        orderByInput.created_at = "desc";
        break;
      case "price_asc":
        orderByInput.base_price = "asc";
        break;
      case "price_desc":
        orderByInput.base_price = "desc";
        break;
      case "relevance":
      default:
        orderByInput.created_at = "desc";
        break;
    }
  }
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallProductAtSummaryTransformer.transform,
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
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCategoriesCategoryIdProducts(props: {
//   categoryId: string & tags.Format<"uuid">;
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