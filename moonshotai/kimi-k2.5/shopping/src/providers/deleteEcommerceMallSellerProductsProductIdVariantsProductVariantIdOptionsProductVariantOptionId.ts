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

export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productVariantId: string & tags.Format<"uuid">;
  productVariantOptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the option with its variant and product to verify ownership chain
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUnique({
      where: {
        id: props.productVariantOptionId,
      },
      select: {
        id: true,
        product_variant: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                ecommerce_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (option === null) {
    throw new HttpException("Product variant option not found", 404);
  }
  // Verify the option belongs to the specified variant
  if (option.product_variant.id !== props.productVariantId) {
    throw new HttpException(
      "Option does not belong to the specified variant",
      403,
    );
  }
  // Verify the variant belongs to the specified product
  if (option.product_variant.product.id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      403,
    );
  }
  // Verify seller owns the product
  if (
    option.product_variant.product.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the option
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.delete({
    where: {
      id: props.productVariantOptionId,
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
// export async function deleteEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptionsProductVariantOptionId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productVariantId: string;
//   productVariantOptionId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------