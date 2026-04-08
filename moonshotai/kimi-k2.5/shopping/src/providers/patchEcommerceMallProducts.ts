import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProducts(props: {
  body: IEcommerceMallProduct.IRequest;
}): Promise<IPageIEcommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    seller: {
      approval_status: "approved",
      deleted_at: null,
    },
  };
  if (props.body.search !== null && props.body.search.length > 0) {
    baseWhere.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.categoryId !== null) {
    baseWhere.category_id = props.body.categoryId;
  }
  if (props.body.subcategoryId !== null) {
    baseWhere.category_id = props.body.subcategoryId;
  }
  const priceFilter: Prisma.IntFilter<"ecommerce_mall_products"> = {};
  if (props.body.minPrice !== null) {
    priceFilter.gte = props.body.minPrice;
  }
  if (props.body.maxPrice !== null) {
    priceFilter.lte = props.body.maxPrice;
  }
  if (Object.keys(priceFilter).length > 0) {
    baseWhere.base_price = priceFilter;
  }
  let records: Awaited<
    ReturnType<typeof MyGlobal.prisma.ecommerce_mall_products.findMany>
  >;
  let total: number;
  if (props.body.inStockOnly === true) {
    const inStockWhere: Prisma.ecommerce_mall_productsWhereInput = {
      ...baseWhere,
      variants: {
        some: {
          inventoryRecords: {
            some: {
              quantity: {
                gt: 0,
              },
            },
          },
        },
      },
    };
    total = await MyGlobal.prisma.ecommerce_mall_products.count({
      where: inStockWhere,
    });
    let orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput;
    switch (props.body.sortBy) {
      case "priceAsc":
        orderBy = { base_price: "asc" };
        break;
      case "priceDesc":
        orderBy = { base_price: "desc" };
        break;
      case "newest":
      default:
        orderBy = { created_at: "desc" };
        break;
    }
    records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: inStockWhere,
      orderBy,
      skip,
      take: limit,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    });
  } else {
    total = await MyGlobal.prisma.ecommerce_mall_products.count({
      where: baseWhere,
    });
    let orderBy: Prisma.ecommerce_mall_productsOrderByWithRelationInput;
    switch (props.body.sortBy) {
      case "priceAsc":
        orderBy = { base_price: "asc" };
        break;
      case "priceDesc":
        orderBy = { base_price: "desc" };
        break;
      case "newest":
      default:
        orderBy = { created_at: "desc" };
        break;
    }
    records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
      where: baseWhere,
      orderBy,
      skip,
      take: limit,
      ...EcommerceMallProductAtSummaryTransformer.select(),
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallProductAtSummaryTransformer.transform,
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProducts(props: {
//   body: IEcommerceMallProduct.IRequest;
// }): Promise<IPageIEcommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_products.findMany({
//     ...EcommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------