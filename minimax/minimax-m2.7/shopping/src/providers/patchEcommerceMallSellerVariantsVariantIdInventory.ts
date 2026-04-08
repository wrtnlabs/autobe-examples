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

export async function patchEcommerceMallSellerVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // 1. Fetch variant with product to verify ownership
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        ecommerce_mall_product_id: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
          } satisfies Prisma.ecommerce_mall_productsSelect,
        },
      },
    });
  // 2. Verify seller owns the product containing this variant
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Calculate current stock from sum of all inventory records
  const stockAggregate =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const currentStock = stockAggregate._sum.quantity_change ?? 0;
  // 4. For adjustments (deductions), verify quantity doesn't exceed current stock
  if (props.body.quantityChange > currentStock) {
    throw new HttpException("Adjustment quantity exceeds available stock", 400);
  }
  // 5. Create inventory record
  const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: await EcommerceMallInventoryRecordCollector.collect({
      body: props.body,
      ecommerceMallProductVariants: { id: props.variantId },
    }),
    ...EcommerceMallInventoryRecordTransformer.select(),
  });
  // 6. Return via transformer
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
// export async function patchEcommerceMallSellerVariantsVariantIdInventory(props: {
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