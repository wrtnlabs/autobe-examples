import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallInventoryRecordCollector } from "../collectors/ECommerceMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallInventoryRecordTransformer } from "../transformers/ECommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IECommerceMallInventoryRecord.ICreate;
}): Promise<IECommerceMallInventoryRecord> {
  // ----
  // VALIDATION
  // ----
  // Validate quantity_change is non-zero
  if (props.body.quantity_change === 0) {
    throw new HttpException(
      "Quantity change must be a non-zero integer. Positive values restock inventory; negative values subtract inventory.",
      400,
    );
  }
  // Validate reason is non-empty
  if (props.body.reason.length === 0) {
    throw new HttpException(
      "A textual reason is required for inventory adjustments.",
      400,
    );
  }
  // ----
  // AUTHORIZATION & OWNERSHIP
  // ----
  // Verify the product exists and is owned by the requesting seller
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        visibility: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the product visibility allows inventory management
  if (product.visibility === "suspended" || product.visibility === "deleted") {
    throw new HttpException(
      "Cannot manage inventory for a product that is suspended or deleted.",
      400,
    );
  }
  // Verify the variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, e_commerce_mall_product_id: true },
    });
  if (variant.e_commerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product.",
      400,
    );
  }
  // ----
  // CREATE INVENTORY RECORD
  // ----
  const record = await MyGlobal.prisma.e_commerce_mall_inventory_records.create(
    {
      data: await ECommerceMallInventoryRecordCollector.collect({
        body: props.body,
        eCommerceMallProductVariants: { id: props.variantId } satisfies IEntity,
      }),
      ...ECommerceMallInventoryRecordTransformer.select(),
    },
  );
  return await ECommerceMallInventoryRecordTransformer.transform(record);
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
// import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IECommerceMallInventoryRecord.ICreate;
// }): Promise<IECommerceMallInventoryRecord> {
//   const record = await MyGlobal.prisma.e_commerce_mall_inventory_records.create({
//     data: await ECommerceMallInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallInventoryRecordTransformer.select(),
//   });
//   return await ECommerceMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------