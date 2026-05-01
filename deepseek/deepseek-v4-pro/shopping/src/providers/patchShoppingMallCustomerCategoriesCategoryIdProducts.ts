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

export async function patchShoppingMallCustomerCategoriesCategoryIdProducts(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, deleted_at: true },
    });
  if (category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  const childCategories =
    await MyGlobal.prisma.shopping_mall_categories.findMany({
      where: { parent_id: props.categoryId, deleted_at: null },
      select: { id: true },
    });
  const categoryIds: string[] = [
    props.categoryId,
    ...childCategories.map((c) => c.id),
  ];
  const whereInput = {
    deleted_at: null,
    shopping_mall_category_id: { in: categoryIds },
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? { name: { contains: props.body.search, mode: "insensitive" as const } }
      : {}),
    ...(props.body.min_price !== undefined || props.body.max_price !== undefined
      ? {
          base_price: {
            ...(props.body.min_price !== undefined
              ? { gte: props.body.min_price }
              : {}),
            ...(props.body.max_price !== undefined
              ? { lte: props.body.max_price }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const orderByInput = (
    props.body.sort === "price_asc"
      ? { base_price: "asc" as const }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_productsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  let transformed = await ArrayUtil.asyncMap(
    records,
    ShoppingMallProductAtSummaryTransformer.transform,
  );
  if (props.body.in_stock_only) {
    transformed = transformed.filter((p) => p.is_purchasable);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const total: number = transformed.length;
  const skip: number = (page - 1) * limit;
  const paged = transformed.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paged,
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
// export async function patchShoppingMallCustomerCategoriesCategoryIdProducts(props: {
//   customer: CustomerPayload;
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