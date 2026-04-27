import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallProductAtSummaryTransformer } from "../transformers/ECommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchECommerceMallAdministratorProducts(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallProduct.IRequest;
}): Promise<IPageIECommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.e_commerce_mall_productsWhereInput = {
    visibility: "visible",
  };
  if (props.body.search) {
    whereInput.name = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.categoryId) {
    whereInput.category_id = props.body.categoryId;
  }
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    const priceFilter: Prisma.FloatFilter = {};
    if (props.body.minPrice !== undefined) {
      priceFilter.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== undefined) {
      priceFilter.lte = props.body.maxPrice;
    }
    whereInput.base_price = priceFilter;
  }
  if (props.body.inStockOnly === true) {
    whereInput.variants = {
      some: {
        deleted_at: null,
      },
    };
  }
  const orderByInput: Prisma.e_commerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const total = await MyGlobal.prisma.e_commerce_mall_products.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.e_commerce_mall_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ECommerceMallProductAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallProductAtSummaryTransformer.transform,
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorProducts(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallProduct.IRequest;
// }): Promise<IPageIECommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_products.findMany({
//     ...ECommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------