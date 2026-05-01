import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductAtSummaryTransformer } from "../transformers/ShoppingMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Resolve category IDs including direct subcategories for parent-category browsing
  let categoryIds: string[] = [];
  if (props.body.category_id) {
    const subcategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: {
          parent_id: props.body.category_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    categoryIds = [props.body.category_id, ...subcategories.map((c) => c.id)];
  }
  // Build WHERE clause with mandatory visibility filters
  const whereInput = {
    deleted_at: null,
    seller: {
      banned_at: null,
      suspended_at: null,
      approval_status: "approved",
    },
    ...(categoryIds.length > 0 && {
      shopping_mall_category_id: { in: categoryIds },
    }),
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...((props.body.min_price !== undefined ||
      props.body.max_price !== undefined) && {
      base_price: {
        ...(props.body.min_price !== undefined && {
          gte: props.body.min_price,
        }),
        ...(props.body.max_price !== undefined && {
          lte: props.body.max_price,
        }),
      },
    }),
    ...(props.body.in_stock_only && {
      variants: {
        some: {
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  // Build ORDER BY from sort parameter
  const orderBy = (
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  // Execute queries sequentially (NOT Promise.all)
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
    orderBy,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerProducts(props: {
//   customer: CustomerPayload;
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