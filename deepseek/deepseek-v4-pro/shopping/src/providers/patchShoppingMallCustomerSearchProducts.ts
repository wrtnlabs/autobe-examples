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

export async function patchShoppingMallCustomerSearchProducts(props: {
  customer: CustomerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      suspended_at: null,
      banned_at: null,
    },
  };
  if (props.body.search) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  if (props.body.category_id) {
    const childCategories =
      await MyGlobal.prisma.shopping_mall_categories.findMany({
        where: {
          parent_id: props.body.category_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    const categoryIds: string[] = [
      props.body.category_id,
      ...childCategories.map((c) => c.id),
    ];
    whereInput.shopping_mall_category_id = { in: categoryIds };
  }
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    const basePriceFilter: Prisma.FloatFilter = {};
    if (props.body.min_price !== undefined) {
      basePriceFilter.gte = props.body.min_price;
    }
    if (props.body.max_price !== undefined) {
      basePriceFilter.lte = props.body.max_price;
    }
    whereInput.base_price = basePriceFilter;
  }
  if (props.body.in_stock_only) {
    const variantsWithInventory =
      await MyGlobal.prisma.shopping_mall_product_variants.findMany({
        where: { deleted_at: null },
        select: {
          shopping_mall_product_id: true,
          inventoryRecords: {
            select: { quantity_change: true },
          },
        },
      });
    const productStockMap = new Map<string, number>();
    for (const variant of variantsWithInventory) {
      const totalStock: number = variant.inventoryRecords.reduce(
        (sum: number, r) => sum + r.quantity_change,
        0,
      );
      const current: number =
        productStockMap.get(variant.shopping_mall_product_id) ?? 0;
      productStockMap.set(
        variant.shopping_mall_product_id,
        current + totalStock,
      );
    }
    const inStockProductIds: string[] = [];
    for (const [productId, totalStock] of productStockMap) {
      if (totalStock > 0) {
        inStockProductIds.push(productId);
      }
    }
    if (inStockProductIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      };
    }
    whereInput.id = { in: inStockProductIds };
  }
  let orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "price_asc":
      orderByInput = { base_price: "asc" };
      break;
    case "price_desc":
      orderByInput = { base_price: "desc" };
      break;
    default:
      orderByInput = { created_at: "desc" };
      break;
  }
  const data = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerSearchProducts(props: {
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