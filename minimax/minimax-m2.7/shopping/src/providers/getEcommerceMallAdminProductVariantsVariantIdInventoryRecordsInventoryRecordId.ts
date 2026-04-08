import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  admin: AdminPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord.ISummary> {
  // Verify the inventory record exists and belongs to the specified variant
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
      },
    });
  // Verify the inventory record belongs to the specified variant
  if (record.ecommerce_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Inventory record not found", 404);
  }
  // Return the transformed inventory record summary
  return {
    id: record.id,
    quantityChange: record.quantity_change,
    reason: record.reason,
    createdAt: toISOStringSafe(record.created_at),
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
// export async function getEcommerceMallAdminProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
//   admin: AdminPayload;
//   variantId: string & tags.Format<"uuid">;
//   inventoryRecordId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallInventoryRecord> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------