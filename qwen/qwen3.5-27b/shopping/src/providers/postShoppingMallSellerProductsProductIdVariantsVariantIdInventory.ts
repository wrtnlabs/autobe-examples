import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryRecordCollector } from "../collectors/ShoppingMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.ICreate;
}): Promise<IShoppingMallInventoryRecord> {
  // Validate seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Validate variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Validate quantity is non-zero
  if (props.body.quantity_change === 0) {
    throw new HttpException("Quantity change must be non-zero", 400);
  }
  // Validate reason is not empty
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required and cannot be empty", 400);
  }
  // Create inventory record
  const record = await MyGlobal.prisma.shopping_mall_inventory_records.create({
    data: await ShoppingMallInventoryRecordCollector.collect({
      body: props.body,
      shoppingMallProductVariants: variant,
    }),
    ...ShoppingMallInventoryRecordTransformer.select(),
  });
  return await ShoppingMallInventoryRecordTransformer.transform(record);
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
// import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerProductsProductIdVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallInventoryRecord.ICreate;
// }): Promise<IShoppingMallInventoryRecord> {
//   const record = await MyGlobal.prisma.shopping_mall_inventory_records.create({
//     data: await ShoppingMallInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallInventoryRecordTransformer.select(),
//   });
//   return await ShoppingMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------