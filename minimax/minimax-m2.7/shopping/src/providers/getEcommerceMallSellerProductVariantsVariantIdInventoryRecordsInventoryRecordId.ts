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

export async function getEcommerceMallSellerProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord> {
  // Find variant with product ownership info
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            name: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  // Verify variant is not soft-deleted
  if (variant.deleted_at !== null) {
    throw new HttpException("Product variant not found", 404);
  }
  // Verify seller owns this product
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the specific inventory record
  const record =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.inventoryRecordId },
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
      },
    });
  // Verify inventory record belongs to the specified variant
  if (record.id !== props.inventoryRecordId) {
    throw new HttpException("Inventory record not found", 404);
  }
  // Get all inventory records for this variant to calculate current stock
  const allRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      orderBy: { created_at: "asc" },
    });
  // Calculate current stock quantity
  const totalStockQuantity = allRecords.reduce(
    (sum, r) => sum + r.quantity_change,
    0,
  );
  // Build recentChanges - include the specific record and most recent ones
  const recentChanges = await Promise.all(
    allRecords
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 10)
      .map((r) => ({
        quantityChange: r.quantity_change,
        reason: r.reason,
        createdAt: r.created_at.toISOString() as string &
          tags.Format<"date-time">,
        variantSku: variant.sku_code,
        productName: variant.product.name,
      })),
  );
  // Determine stock status
  const outOfStockCount = totalStockQuantity <= 0 ? 1 : 0;
  const lowStockCount =
    totalStockQuantity >= 1 && totalStockQuantity <= 10 ? 1 : 0;
  const inStockCount = totalStockQuantity > 10 ? 1 : 0;
  // Build lowStockVariants
  const lowStockVariants: IEcommerceMallInventoryRecord.ILowStockVariant[] =
    totalStockQuantity >= 1 && totalStockQuantity <= 10
      ? [
          {
            id: variant.id as string & tags.Format<"uuid">,
            price: variant.price,
            productName: variant.product.name,
            quantity: totalStockQuantity as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            skuCode: variant.sku_code,
          },
        ]
      : [];
  return {
    totalVariantsCount: 1 as number & tags.Type<"int32">,
    totalStockQuantity: totalStockQuantity as number & tags.Type<"int32">,
    totalStockValue: totalStockQuantity * (variant.price ?? 0),
    outOfStockCount: outOfStockCount as number & tags.Type<"int32">,
    lowStockCount: lowStockCount as number & tags.Type<"int32">,
    inStockCount: inStockCount as number & tags.Type<"int32">,
    lowStockVariants: lowStockVariants,
    recentChanges: recentChanges,
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
// export async function getEcommerceMallSellerProductVariantsVariantIdInventoryRecordsInventoryRecordId(props: {
//   seller: SellerPayload;
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