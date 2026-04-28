import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformProductVariantOptionAtSummaryTransformer } from "../transformers/EcommercePlatformProductVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformProductsProductIdVariantsVariantIdOptions(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommercePlatformProductVariantOption.IRequest;
}): Promise<IPageIEcommercePlatformProductVariantOption.ISummary> {
  // Validate product exists and is not deleted
  await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  // Validate variant exists, belongs to product, and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: {
          id: props.variantId,
          ecommerce_platform_product_id: props.productId,
          deleted_at: null,
        },
      },
    );
  const whereInput: Prisma.ecommerce_platform_product_variant_optionsWhereInput =
    {
      ecommerce_platform_product_variant_id: variant.id,
      deleted_at: null,
      ...(props.body.attribute_keys?.length && {
        attribute_key: { in: props.body.attribute_keys },
      }),
      ...(props.body.attribute_values?.length && {
        attribute_value: { in: props.body.attribute_values },
      }),
    };
  const orderByInput: Prisma.ecommerce_platform_product_variant_optionsOrderByWithRelationInput =
    props.body.sort === "attribute_key"
      ? { attribute_key: props.body.order ?? "desc" }
      : props.body.sort === "attribute_value"
        ? { attribute_value: props.body.order ?? "desc" }
        : props.body.sort === "updated_at"
          ? { updated_at: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommercePlatformProductVariantOptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.count({
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
      records,
      EcommercePlatformProductVariantOptionAtSummaryTransformer.transform,
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
// import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
// import { IPageIEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProductVariantOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformProductsProductIdVariantsVariantIdOptions(props: {
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformProductVariantOption.IRequest;
// }): Promise<IPageIEcommercePlatformProductVariantOption.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_product_variant_options.findMany({
//     ...EcommercePlatformProductVariantOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformProductVariantOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------