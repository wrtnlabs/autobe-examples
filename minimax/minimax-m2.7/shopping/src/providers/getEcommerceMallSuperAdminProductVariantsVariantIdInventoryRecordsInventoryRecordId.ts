import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  superAdmin: SuperadminPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Verify the product variant exists and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        deleted_at: true,
        ecommerce_mall_product_id: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Product variant not found", 404);
  }
  // Step 2: Verify the inventory record exists and belongs to the specified variant
  const inventoryRecord =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        ecommerce_mall_product_variant_id: true,
      },
    });
  if (inventoryRecord.ecommerce_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Inventory record not found for this variant", 404);
  }
  // Step 3: Calculate current stock by summing all quantity_change values for the variant
  const stockAggregation =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: {
        ecommerce_mall_product_variant_id: props.variantId,
      },
      _sum: {
        quantity_change: true,
      },
    });
  const currentStock = stockAggregation._sum.quantity_change ?? 0;
  // Step 4: Return the inventory record overview with the requested record in recentChanges
  return {
    totalVariantsCount: 1,
    totalStockQuantity: currentStock,
    totalStockValue: currentStock * (variant.price ?? 0),
    outOfStockCount: currentStock === 0 ? 1 : 0,
    lowStockCount: currentStock > 0 && currentStock <= 10 ? 1 : 0,
    inStockCount: currentStock > 10 ? 1 : 0,
    lowStockVariants: [],
    recentChanges: [
      {
        quantityChange: inventoryRecord.quantity_change,
        reason: inventoryRecord.reason,
        createdAt: inventoryRecord.created_at.toISOString() as string &
          tags.Format<"date-time">,
        variantSku: variant.sku_code,
        productName: variant.product.name,
      },
    ],
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
// export async function getEcommerceMallSuperAdminProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
//   superAdmin: SuperadminPayload;
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