import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantOptionCollector } from "../collectors/EcommerceMallProductVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantOptionTransformer } from "../transformers/EcommerceMallProductVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptions(props: {
  seller: SellerPayload;
  productId: string;
  productVariantId: string;
  body: IEcommerceMallProductVariantOption.ICreate;
}): Promise<IEcommerceMallProductVariantOption> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.productVariantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
      data: await EcommerceMallProductVariantOptionCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: { id: props.productVariantId },
      }),
      ...EcommerceMallProductVariantOptionTransformer.select(),
    });
  return await EcommerceMallProductVariantOptionTransformer.transform(record);
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerProductsProductIdVariantsProductVariantIdOptions(props: {
//   seller: SellerPayload;
//   productId: string;
//   productVariantId: string;
//   body: IEcommerceMallProductVariantOption.ICreate;
// }): Promise<IEcommerceMallProductVariantOption> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_options.create({
//     data: await EcommerceMallProductVariantOptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductVariantOptionTransformer.select(),
//   });
//   return await EcommerceMallProductVariantOptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------