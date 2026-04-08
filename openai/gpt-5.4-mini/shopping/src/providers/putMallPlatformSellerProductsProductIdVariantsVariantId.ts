import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantTransformer } from "../transformers/MallPlatformProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariant.IUpdate;
}): Promise<IMallPlatformProductVariant> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        mall_platform_product_id: true,
      },
    });
  if (variant.mall_platform_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  if (props.body.skuCode !== undefined) {
    const duplicated =
      await MyGlobal.prisma.mall_platform_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          NOT: {
            id: props.variantId,
          },
        },
        select: {
          id: true,
        },
      });
    if (duplicated !== null) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  await MyGlobal.prisma.mall_platform_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.skuCode !== undefined
        ? { sku_code: props.body.skuCode }
        : {}),
      ...(props.body.optionValues !== undefined
        ? { option_values: props.body.optionValues }
        : {}),
      ...(props.body.priceOverride !== undefined
        ? { price_override: props.body.priceOverride }
        : {}),
      ...(props.body.isActive !== undefined
        ? { is_active: props.body.isActive }
        : {}),
    },
  });
  const updated =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...MallPlatformProductVariantTransformer.select(),
    });
  return await MallPlatformProductVariantTransformer.transform(updated);
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
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putMallPlatformSellerProductsProductIdVariantsVariantId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariant.IUpdate;
// }): Promise<IMallPlatformProductVariant> {
//   await MyGlobal.prisma.mall_platform_product_variants.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
//     where: { ... },
//     ...MallPlatformProductVariantTransformer.select(),
//   });
//   return await MallPlatformProductVariantTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------