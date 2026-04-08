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

export async function postEcommerceMallSellerSellersMeVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Validate quantity magnitude is non-zero
  // Positive = restock, Negative = adjustment
  if (props.body.quantityChange === 0) {
    throw new HttpException("Quantity must be non-zero", 400);
  }
  // Fetch the variant and verify ownership through its product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify seller owns the product containing this variant (Variant Ownership rule)
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate current stock by summing all inventory records
  const inventoryRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
      },
      select: {
        quantity_change: true,
      },
    });
  const currentStock = inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  // For adjustments (negative quantity), verify current stock is sufficient
  if (props.body.quantityChange < 0) {
    const adjustmentQuantity = Math.abs(props.body.quantityChange);
    if (adjustmentQuantity > currentStock) {
      throw new HttpException(
        "Adjustment quantity exceeds current available stock",
        400,
      );
    }
  }
  // Create the inventory record
  const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: await EcommerceMallInventoryRecordCollector.collect({
      body: props.body,
      ecommerceMallProductVariants: { id: props.variantId },
    }),
    ...EcommerceMallInventoryRecordTransformer.select(),
  });
  return await EcommerceMallInventoryRecordTransformer.transform(record);
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
// export async function postEcommerceMallSellerSellersMeVariantsVariantIdInventory(props: {
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