import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const created = await MyGlobal.prisma.shopping_mall_product_variants.create({
    data: await ShoppingMallProductVariantCollector.collect({
      body: props.body,
      product: { id: props.productId },
      seller: { id: props.seller.id },
      session: { id: props.seller.session_id },
    }),
  });
  if (
    props.body.initialStockQuantity !== undefined &&
    props.body.initialStockQuantity > 0
  ) {
    await MyGlobal.prisma.shopping_mall_inventory_records.create({
      data: {
        id: v4(),
        shopping_mall_product_variant_id: created.id,
        quantity_change: props.body.initialStockQuantity,
        reason: "Initial stock",
        created_at: new Date(),
      },
    });
  }
  const result =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: created.id },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(result);
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
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
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