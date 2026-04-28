import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductAtSummaryTransformer } from "../transformers/EcommercePlatformProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformProducts(props: {
  body: IEcommercePlatformProduct.IRequest;
}): Promise<IPageIEcommercePlatformProduct.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const offset = (page - 1) * limit;
  const sortField = props.body.sortField ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput = {
    deleted_at: null,
    ...(props.body.categoryId && {
      category: { id: props.body.categoryId },
    }),
    ...(props.body.sellerProfileId && {
      sellerProfile: { id: props.body.sellerProfileId },
    }),
    ...(props.body.minBasePrice !== undefined && {
      base_price: { gte: props.body.minBasePrice },
    }),
    ...(props.body.maxBasePrice !== undefined && {
      base_price: { lte: props.body.maxBasePrice },
    }),
    ...(props.body.productName && {
      name: { contains: props.body.productName },
    }),
    ...(props.body.includeUnavailable !== true && {
      variants: {
        some: {
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.ecommerce_platform_productsWhereInput;
  const orderByInput = (
    sortField === "name"
      ? ({
          name: sortOrder,
        } satisfies Prisma.ecommerce_platform_productsOrderByWithRelationInput)
      : sortField === "basePrice"
        ? ({
            base_price: sortOrder,
          } satisfies Prisma.ecommerce_platform_productsOrderByWithRelationInput)
        : sortField === "updatedAt"
          ? ({
              updated_at: sortOrder,
            } satisfies Prisma.ecommerce_platform_productsOrderByWithRelationInput)
          : ({
              created_at: sortOrder,
            } satisfies Prisma.ecommerce_platform_productsOrderByWithRelationInput)
  ) satisfies Prisma.ecommerce_platform_productsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_platform_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: offset,
    take: limit,
    ...EcommercePlatformProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_products.count({
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
      data,
      EcommercePlatformProductAtSummaryTransformer.transform,
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
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformProducts(props: {
//   body: IEcommercePlatformProduct.IRequest;
// }): Promise<IPageIEcommercePlatformProduct.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_products.findMany({
//     ...EcommercePlatformProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------