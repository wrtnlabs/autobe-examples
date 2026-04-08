import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariant[]> {
  // Step 1: Verify product exists and belongs to the seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Step 2: Check ownership - sellers can only view variants for their own products
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Query all active variants for the product, sorted by newest first
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      ...EcommerceMallProductVariantTransformer.select(),
      where: {
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Step 4: Transform and return the array of variants
  return await ArrayUtil.asyncMap(
    variants,
    EcommerceMallProductVariantTransformer.transform,
  );
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallProductVariant> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
//     ...EcommerceMallProductVariantTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------