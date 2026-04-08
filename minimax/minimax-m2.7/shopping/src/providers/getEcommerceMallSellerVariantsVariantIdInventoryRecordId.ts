import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerVariantsVariantIdInventoryRecordId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  // Verify the variant exists and belongs to the authenticated seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
      select: {
        id: true,
        ecommerce_mall_product_id: true,
      },
      where: {
        id: props.variantId,
        deleted_at: null,
      },
    });
  // Verify the product belongs to this seller by checking the product table
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
      where: {
        id: variant.ecommerce_mall_product_id,
      },
    });
  // Verify ownership - the product must belong to this seller
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Not Found", 404);
  }
  // Query the inventory record by recordId and variantId
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
      },
      where: {
        id: props.recordId,
        ecommerce_mall_product_variant_id: props.variantId,
      },
    });
  // Transform to response DTO
  return {
    id: record.id,
    quantityChange: record.quantity_change,
    reason: record.reason,
    createdAt: record.created_at.toISOString(),
  };
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
// export async function getEcommerceMallSellerVariantsVariantIdInventoryRecordId(props: {
//   seller: SellerPayload;
//   variantId: string & tags.Format<"uuid">;
//   recordId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallInventoryRecord> {
//   const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
//     ...EcommerceMallInventoryRecordTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallInventoryRecordTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------