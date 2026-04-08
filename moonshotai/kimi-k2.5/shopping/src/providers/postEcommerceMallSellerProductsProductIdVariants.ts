import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function postEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.ICreate;
}): Promise<IEcommerceMallProductVariant> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, seller_id: true },
  });
  if (product === null || product.seller_id !== props.seller.id) {
    throw new HttpException("Product not found", 404);
  }
  // Check for duplicate SKU code within this product
  const existingVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        product_id: props.productId,
        sku_code: props.body.skuCode,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code already exists for this product", 409);
  }
  // Collect data for creation
  const data = await EcommerceMallProductVariantCollector.collect({
    body: props.body,
    product: { id: product.id },
  });
  // Create variant with transformer select options
  const record = await MyGlobal.prisma.ecommerce_mall_product_variants.create({
    data,
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string;
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