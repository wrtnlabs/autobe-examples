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

export async function postEcommerceMallSellerEcommerceMallVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // 1. Verify variant exists, is not deleted, and belongs to authenticated seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        quantity: true,
        sku_code: true,
        price: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  if (
    variant === null ||
    variant.product.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Variant not found", 404);
  }
  // 2. Calculate quantity change based on operation type
  const quantityChange: number =
    props.body.operationType === "restock"
      ? props.body.quantity
      : -props.body.quantity;
  // 3. Validate adjustment doesn't result in negative stock
  if (props.body.operationType === "adjustment") {
    const newQuantity: number = variant.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new HttpException(
        `Adjustment quantity exceeds current stock. Current: ${variant.quantity}, Requested: ${props.body.quantity}`,
        400,
      );
    }
  }
  // 4. Create inventory record
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: {
      id: v4(),
      ecommerce_mall_product_variant_id: props.variantId,
      quantity_change: quantityChange,
      reason: props.body.reason,
      created_at: new Date(),
    },
  });
  // 5. Build aggregated response - get all variants owned by seller
  const allVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        deleted_at: null,
        product: {
          ecommerce_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        quantity: true,
        price: true,
        sku_code: true,
        product: {
          select: {
            name: true,
            base_price: true,
          },
        },
      },
    });
  // Calculate statistics
  let totalStockQuantity: number = 0;
  let totalStockValue: number = 0;
  let outOfStockCount: number = 0;
  let lowStockCount: number = 0;
  let inStockCount: number = 0;
  for (const v of allVariants) {
    totalStockQuantity += v.quantity;
    const price: number = v.price !== null ? v.price : v.product.base_price;
    totalStockValue += v.quantity * price;
    if (v.quantity === 0) {
      outOfStockCount++;
    } else if (v.quantity <= 10) {
      lowStockCount++;
    } else {
      inStockCount++;
    }
  }
  // Get low stock variants (1-10 units, limit 20, ordered by quantity asc)
  const lowStockVariants: IEcommerceMallInventoryRecord.ILowStockVariant[] =
    allVariants
      .filter((v) => v.quantity >= 1 && v.quantity <= 10)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 20)
      .map(
        (v): IEcommerceMallInventoryRecord.ILowStockVariant => ({
          id: v.id,
          skuCode: v.sku_code,
          productName: v.product.name,
          quantity: v.quantity,
          price: v.price,
        }),
      );
  // Get 10 most recent inventory changes
  const recentChangesRaw =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: {
        productVariant: {
          product: {
            ecommerce_mall_seller_id: props.seller.id,
          },
        },
      },
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
    recentChangesRaw.map(
      (r): IEcommerceMallInventoryRecord.IRecentChange => ({
        quantityChange: r.quantity_change,
        reason: r.reason,
        createdAt: r.created_at.toISOString() as string &
          tags.Format<"date-time">,
        variantSku: r.productVariant.sku_code,
        productName: r.productVariant.product.name,
      }),
    );
  // Build and return response
  const response: IEcommerceMallInventoryRecord = {
    totalVariantsCount: allVariants.length,
    totalStockQuantity,
    totalStockValue,
    outOfStockCount,
    lowStockCount,
    inStockCount,
    lowStockVariants,
    recentChanges,
  };
  return response;
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
// export async function postEcommerceMallSellerEcommerceMallVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallInventoryRecord.ICreate;
// }): Promise<IEcommerceMallInventoryRecord> {
//   await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
//     data: await EcommerceMallInventoryRecordCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------