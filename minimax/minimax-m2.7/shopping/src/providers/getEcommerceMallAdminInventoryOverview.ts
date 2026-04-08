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

export async function getEcommerceMallAdminInventoryOverview(props: {
  admin: AdminPayload;
}): Promise<IEcommerceMallInventoryRecord> {
  // Admin has elevated access to view all sellers' inventory data (section 712)
  // Query all product variants with their inventory records and product info
  const variants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        deleted_at: null,
        product: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
          },
        },
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
    });
  // Calculate aggregates from variants
  let totalStockQuantity = 0;
  let totalStockValue = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let inStockCount = 0;
  for (const variant of variants) {
    const currentStock = variant.inventoryRecords.reduce(
      (
        sum: number,
        record: {
          quantity_change: number;
        },
      ) => sum + record.quantity_change,
      0,
    );
    const price = variant.price ?? variant.product.base_price;
    const stockValue = currentStock * price;
    totalStockQuantity += currentStock;
    totalStockValue += stockValue;
    if (currentStock === 0) {
      outOfStockCount++;
    } else if (currentStock <= 10) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  }
  // Get low stock variants (1-10 units), limited to 20, ordered by quantity ascending
  const lowStockVariantsList: IEcommerceMallInventoryRecord.ILowStockVariant[] =
    variants
      .filter((v) => {
        const qty = v.inventoryRecords.reduce(
          (
            sum: number,
            r: {
              quantity_change: number;
            },
          ) => sum + r.quantity_change,
          0,
        );
        return qty > 0 && qty <= 10;
      })
      .sort((a, b) => {
        const qtyA = a.inventoryRecords.reduce(
          (
            sum: number,
            r: {
              quantity_change: number;
            },
          ) => sum + r.quantity_change,
          0,
        );
        const qtyB = b.inventoryRecords.reduce(
          (
            sum: number,
            r: {
              quantity_change: number;
            },
          ) => sum + r.quantity_change,
          0,
        );
        return qtyA - qtyB;
      })
      .slice(0, 20)
      .map((v): IEcommerceMallInventoryRecord.ILowStockVariant => {
        const qty = v.inventoryRecords.reduce(
          (
            sum: number,
            r: {
              quantity_change: number;
            },
          ) => sum + r.quantity_change,
          0,
        );
        return {
          id: v.id as string & tags.Format<"uuid">,
          skuCode: v.sku_code,
          productName: v.product.name,
          price: v.price,
          quantity: qty as number & tags.Type<"int32"> & tags.Minimum<1>,
        };
      });
  // Get 10 most recent inventory changes
  const recentChangesRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        quantity_change: true,
        reason: true,
        created_at: true,
        productVariant: {
          select: {
            sku_code: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  const recentChanges: IEcommerceMallInventoryRecord.IRecentChange[] =
    recentChangesRecords.map(
      (change): IEcommerceMallInventoryRecord.IRecentChange => ({
        quantityChange: change.quantity_change as number & tags.Type<"int32">,
        reason: change.reason,
        createdAt: change.created_at.toISOString() as string &
          tags.Format<"date-time">,
        variantSku: change.productVariant.sku_code,
        productName: change.productVariant.product.name,
      }),
    );
  return {
    totalVariantsCount: variants.length as number & tags.Type<"int32">,
    totalStockQuantity: totalStockQuantity as number & tags.Type<"int32">,
    totalStockValue: totalStockValue,
    outOfStockCount: outOfStockCount as number & tags.Type<"int32">,
    lowStockCount: lowStockCount as number & tags.Type<"int32">,
    inStockCount: inStockCount as number & tags.Type<"int32">,
    lowStockVariants: lowStockVariantsList,
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
// export async function getEcommerceMallAdminInventoryOverview(props: {
//   admin: AdminPayload;
// }): Promise<IEcommerceMallInventoryRecord> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------