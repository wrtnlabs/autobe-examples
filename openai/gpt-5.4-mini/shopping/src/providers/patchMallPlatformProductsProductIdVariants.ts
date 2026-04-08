import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformProductVariantAtSummaryTransformer } from "../transformers/MallPlatformProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.IRequest;
}): Promise<IPageIMallPlatformProductVariant.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const where = {
    mall_platform_product_id: props.productId,
    deleted_at: null,
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { sku_code: { contains: search } },
            { option_values: { contains: search } },
          ],
        }
      : {}),
    ...(props.body.isActive !== undefined
      ? { is_active: props.body.isActive }
      : {}),
  } satisfies Prisma.mall_platform_product_variantsWhereInput;
  const orderBy = (() => {
    switch (props.body.sort) {
      case "sku_code_asc":
        return [{ sku_code: "asc" as const }, { id: "asc" as const }];
      case "sku_code_desc":
        return [{ sku_code: "desc" as const }, { id: "desc" as const }];
      case "option_values_asc":
        return [{ option_values: "asc" as const }, { id: "asc" as const }];
      case "option_values_desc":
        return [{ option_values: "desc" as const }, { id: "desc" as const }];
      case "oldest":
        return [{ created_at: "asc" as const }, { id: "asc" as const }];
      case "newest":
      default:
        return [{ created_at: "desc" as const }, { id: "desc" as const }];
    }
  })();
  const records = await MyGlobal.prisma.mall_platform_product_variants.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy,
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformProductsProductIdVariants(props: {
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