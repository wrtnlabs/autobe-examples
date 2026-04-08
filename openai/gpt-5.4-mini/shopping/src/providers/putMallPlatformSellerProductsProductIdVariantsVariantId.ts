import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
  const current =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        mall_platform_product_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (current.mall_platform_product_id !== props.productId) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== current.sku_code
  ) {
    const duplicate =
      await MyGlobal.prisma.mall_platform_product_variants.findFirst({
        where: {
          sku_code: props.body.sku_code,
          NOT: { id: props.variantId },
        },
        select: { id: true },
      });
    if (duplicate !== null) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  await MyGlobal.prisma.mall_platform_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined
        ? { sku_code: props.body.sku_code }
        : {}),
      ...(props.body.option_values !== undefined
        ? { option_values: props.body.option_values }
        : {}),
      ...(props.body.price_override !== undefined
        ? { price_override: props.body.price_override }
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
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