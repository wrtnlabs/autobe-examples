import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantCollector } from "../collectors/ShoppingMallProductVariantCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  // Validate product exists and belongs to seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
        shopping_mall_seller_id: props.seller.id,
      },
    });
  // Check SKU code uniqueness
  const existingVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
  if (existingVariant !== null) {
    throw new HttpException("SKU code already exists for this product", 400);
  }
  // Create variant using collector
  const record = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: await ShoppingMallProductVariantCollector.collect({
      body: props.body,
      shoppingMallProducts: product,
    }),
    ...ShoppingMallProductVariantTransformer.select(),
  });
  return await ShoppingMallProductVariantTransformer.transform(record);
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
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariant.ICreate;
// }): Promise<IShoppingMallProductVariant> {
//   const record = await MyGlobal.prisma.shopping_mall_product_variants.create({
//     data: await ShoppingMallProductVariantCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallProductVariantTransformer.select(),
//   });
//   return await ShoppingMallProductVariantTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------