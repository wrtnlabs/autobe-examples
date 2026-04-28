import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommercePlatformSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const option =
    await MyGlobal.prisma.ecommerce_platform_product_variant_options.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: {
          id: true,
          ecommerce_platform_product_variant_id: true,
          deleted_at: true,
          productVariant: {
            select: {
              id: true,
              ecommerce_platform_product_id: true,
              product: {
                select: {
                  id: true,
                  ecommerce_platform_seller_profile_id: true,
                },
              },
            },
          },
        },
      },
    );
  if (option.ecommerce_platform_product_variant_id !== props.variantId) {
    throw new HttpException(
      "Option does not belong to the specified variant",
      404,
    );
  }
  if (option.productVariant.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      404,
    );
  }
  if (
    option.productVariant.product.ecommerce_platform_seller_profile_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (option.deleted_at !== null) {
    throw new HttpException("Option is already deleted", 400);
  }
  const timestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_platform_product_variant_options.update({
    where: { id: props.optionId },
    data: {
      deleted_at: timestamp,
      updated_at: timestamp,
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommercePlatformSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------