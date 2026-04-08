import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallInventoryRecordCollector } from "../collectors/EcommerceMallInventoryRecordCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordTransformer } from "../transformers/EcommerceMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Ownership verification
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        quantity: true,
        deleted_at: true,
        product: {
          select: {
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  if (variant === null || variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Business rule validation - adjustments cannot result in negative stock
  if (props.body.quantityChange < 0) {
    const newStock = variant.quantity + props.body.quantityChange;
    if (newStock < 0) {
      throw new HttpException(
        `Adjustment would result in negative stock. Current: ${variant.quantity}, adjustment: ${props.body.quantityChange}`,
        400,
      );
    }
  }
  // Step 3: Create inventory record using collector
  const variantEntity: IEntity = {
    id: variant.id,
  };
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: await EcommerceMallInventoryRecordCollector.collect({
        body: props.body,
        ecommerceMallProductVariants: variantEntity,
      }),
      ...EcommerceMallInventoryRecordTransformer.select(),
    });
  // Step 4: Update variant quantity
  await MyGlobal.prisma.ecommerce_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      quantity: {
        increment: props.body.quantityChange,
      },
      updated_at: new Date(),
    },
  });
  // Step 5: Return transformed response
  return await EcommerceMallInventoryRecordTransformer.transform(
    inventoryRecord,
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
// import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallInventoryRecord.ICreate;
// }): Promise<IEcommerceMallInventoryRecord> {
//   const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
//     data: await EcommerceMallInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallInventoryRecordTransformer.select(),
//   });
//   return await EcommerceMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------