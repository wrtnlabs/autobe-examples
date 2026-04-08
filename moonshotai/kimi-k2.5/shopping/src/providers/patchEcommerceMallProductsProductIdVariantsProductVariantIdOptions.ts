import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariantsProductVariantIdOptions(props: {
  productId: string;
  productVariantId: string;
  body: IEcommerceMallProductVariantOption.IRequest;
}): Promise<IPageIEcommerceMallProductVariantOption.ISummary> {
  // Verify product variant exists and belongs to the product
  await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.productVariantId,
      ecommerce_mall_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  // Build where clause with filters
  const where: Prisma.ecommerce_mall_product_variant_optionsWhereInput = {
    ecommerce_mall_product_variant_id: props.productVariantId,
    ...(props.body.optionName !== undefined && {
      option_name: {
        contains: props.body.optionName,
        mode: "insensitive",
      } as Prisma.StringFilter,
    }),
    ...(props.body.optionValue !== undefined && {
      option_value: {
        contains: props.body.optionValue,
        mode: "insensitive",
      } as Prisma.StringFilter,
    }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sort mapping
  const sortField =
    props.body.sort === "optionName" ? "option_name" : "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Execute queries
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      },
      ...EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variant_options.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallProductVariantOptionAtSummaryTransformer.transform,
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IPageIEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProductsProductIdVariantsProductVariantIdOptions(props: {
//   productId: string;
//   productVariantId: string;
//   body: IEcommerceMallProductVariantOption.IRequest;
// }): Promise<IPageIEcommerceMallProductVariantOption.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_variant_options.findMany({
//     ...EcommerceMallProductVariantOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductVariantOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------