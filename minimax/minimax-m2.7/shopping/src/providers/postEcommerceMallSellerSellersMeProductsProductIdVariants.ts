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
import { EcommerceMallProductVariantCollector } from "../collectors/EcommerceMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists and belongs to the authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  // Ownership verification using FK column
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate SKU code is unique globally (excluding deleted variants)
  const existingSku =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        sku_code: props.body.skuCode,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingSku !== null) {
    throw new HttpException("SKU code already exists", 400);
  }
  // Create variant with collector and return via transformer
  const record = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data: await EcommerceMallProductVariantCollector.collect({
      body: props.body,
      ecommerceMallProducts: { id: props.productId },
      ecommerceMallSellers: { id: props.seller.id },
      ecommerceMallSellerSessions: { id: props.seller.session_id },
    }),
    ...EcommerceMallProductVariantTransformer.select(),
  });
  return await EcommerceMallProductVariantTransformer.transform(record);
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
// export async function postEcommerceMallSellerSellersMeProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.ICreate;
// }): Promise<IEcommerceMallProductVariant> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
//     data: await EcommerceMallProductVariantCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductVariantTransformer.select(),
//   });
//   return await EcommerceMallProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------