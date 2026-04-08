import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformProductVariantAtSummaryTransformer } from "../transformers/MallPlatformProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerProductsProductIdVariants(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.IRequest;
}): Promise<IPageIMallPlatformProductVariant.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    mall_platform_product_id: props.productId,
    deleted_at: null,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
  } satisfies Prisma.mall_platform_product_variantsWhereInput;
  const orderBy =
    props.body.sort === "sku_code_asc"
      ? ({
          sku_code: "asc",
        } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
      : props.body.sort === "sku_code_desc"
        ? ({
            sku_code: "desc",
          } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
        : props.body.sort === "option_values_asc"
          ? ({
              option_values: "asc",
            } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
          : props.body.sort === "option_values_desc"
            ? ({
                option_values: "desc",
              } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
            : props.body.sort === "price_asc"
              ? ({
                  price_override: "asc",
                } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
              : props.body.sort === "price_desc"
                ? ({
                    price_override: "desc",
                  } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput)
                : ({
                    created_at: "desc",
                  } satisfies Prisma.mall_platform_product_variantsOrderByWithRelationInput);
  const records = await MyGlobal.prisma.mall_platform_product_variants.findMany(
    {
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformProductVariantAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.mall_platform_product_variants.count({
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
      MallPlatformProductVariantAtSummaryTransformer.transform,
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
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerProductsProductIdVariants(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariant.IRequest;
// }): Promise<IPageIMallPlatformProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_variants.findMany({
//     ...MallPlatformProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------