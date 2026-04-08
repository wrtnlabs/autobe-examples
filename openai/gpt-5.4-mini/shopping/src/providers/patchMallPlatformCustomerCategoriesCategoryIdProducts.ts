import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformProductAtSummaryTransformer } from "../transformers/MallPlatformProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerCategoriesCategoryIdProducts(props: {
  customer: CustomerPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IMallPlatformProduct.IRequest;
}): Promise<IPageIMallPlatformProduct.ISummary> {
  await MyGlobal.prisma.mall_platform_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_productsWhereInput = {
    deleted_at: null,
    category_id: props.categoryId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
    ...(props.body.minPrice !== undefined || props.body.maxPrice !== undefined
      ? {
          base_price: {
            ...(props.body.minPrice !== undefined
              ? { gte: props.body.minPrice }
              : {}),
            ...(props.body.maxPrice !== undefined
              ? { lte: props.body.maxPrice }
              : {}),
          },
        }
      : {}),
  };
  const records = await MyGlobal.prisma.mall_platform_products.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      props.body.sort === "priceAsc"
        ? { base_price: "asc" }
        : props.body.sort === "priceDesc"
          ? { base_price: "desc" }
          : { created_at: "desc" },
    ...MallPlatformProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_products.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductAtSummaryTransformer.transform,
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
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerCategoriesCategoryIdProducts(props: {
//   customer: CustomerPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IMallPlatformProduct.IRequest;
// }): Promise<IPageIMallPlatformProduct.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_products.findMany({
//     ...MallPlatformProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------