import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProductsProductIdVariants(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IRequest;
}): Promise<IPageIShoppingMallProductVariant.ISummary> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (product === null) {
    return {
      pagination: {
        current: 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const page: number = (() => {
    const p = props.body.page;
    if (p == null) return 1;
    if (p <= 0) return 1;
    return p;
  })();
  const limit = props.body.limit ?? 100;
  const where: Prisma.shopping_mall_product_variantsWhereInput = (() => {
    const base: Prisma.shopping_mall_product_variantsWhereInput = {
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    };
    if (props.body.search) {
      base.code = { contains: props.body.search };
    }
    const minPrice = props.body.min_price;
    const maxPrice = props.body.max_price;
    if (minPrice !== undefined && maxPrice !== undefined) {
      base.OR = [
        { price: { not: null, gte: minPrice, lte: maxPrice } },
        {
          price: null,
          product: { base_price: { gte: minPrice, lte: maxPrice } },
        },
      ];
    } else if (minPrice !== undefined) {
      base.OR = [
        { price: { not: null, gte: minPrice } },
        { price: null, product: { base_price: { gte: minPrice } } },
      ];
    } else if (maxPrice !== undefined) {
      base.OR = [
        { price: { not: null, lte: maxPrice } },
        { price: null, product: { base_price: { lte: maxPrice } } },
      ];
    }
    return base;
  })();
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where,
      orderBy: { created_at: "desc" },
      ...ShoppingMallProductVariantAtSummaryTransformer.select(),
    });
  let transformed = await ArrayUtil.asyncMap(
    variants,
    ShoppingMallProductVariantAtSummaryTransformer.transform,
  );
  if (props.body.stock_status === "in_stock") {
    transformed = transformed.filter((v) => v.stock_quantity > 0);
  } else if (props.body.stock_status === "out_of_stock") {
    transformed = transformed.filter((v) => v.stock_quantity <= 0);
  }
  const total = transformed.length;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paginated = transformed.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: paginated,
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
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerProductsProductIdVariants(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariant.IRequest;
// }): Promise<IPageIShoppingMallProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_variants.findMany({
//     ...ShoppingMallProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------