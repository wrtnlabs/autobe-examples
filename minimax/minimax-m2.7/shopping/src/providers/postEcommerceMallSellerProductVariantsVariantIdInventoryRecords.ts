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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Step 1: Verify variant exists and belongs to seller's product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        product: {
          select: {
            id: true,
            name: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  // Step 2: Verify ownership - seller must own the product
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("permission denied", 403);
  }
  // Step 3: Calculate current stock from inventory records
  const stockAggregation =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const currentStock = stockAggregation._sum.quantity_change ?? 0;
  // Step 4: For adjustment operations, verify stock won't go negative
  if (props.body.operationType === "adjustment") {
    if (currentStock < props.body.quantity) {
      throw new HttpException(
        `Adjustment quantity exceeds available stock. Current: ${currentStock}, Requested: ${props.body.quantity}`,
        400,
      );
    }
  }
  // Step 5: Create inventory record using collector
  const variantEntity: IEntity = { id: variant.id };
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: await EcommerceMallInventoryRecordCollector.collect({
      body: props.body,
      productVariant: variantEntity,
    }),
  });
  // Step 6: Return inventory overview by aggregating all seller's variants
  const allVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product: {
          ecommerce_mall_seller_id: props.seller.id,
        },
      },
      select: {
        id: true,
        sku_code: true,
        price: true,
        product: {
          select: { name: true },
        },
      },
    });
  const variantIds = allVariants.map((v) => v.id);
  // Calculate stock for each variant
  const stockByVariant =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.groupBy({
      by: ["ecommerce_mall_product_variant_id"],
      where: {
        ecommerce_mall_product_variant_id: { in: variantIds },
      },
      _sum: { quantity_change: true },
    });
  const stockMap = new Map<string, number>();
  for (const s of stockByVariant) {
    stockMap.set(
      s.ecommerce_mall_product_variant_id,
      s._sum.quantity_change ?? 0,
    );
  }
  // Calculate aggregates
  let totalStockQuantity = 0;
  let totalStockValue = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let inStockCount = 0;
  const lowStockVariantsList: IEcommerceMallInventoryRecord.ILowStockVariant[] =
    [];
  for (const v of allVariants) {
    const stock = stockMap.get(v.id) ?? 0;
    const price = v.price ?? 0;
    totalStockQuantity += stock;
    totalStockValue += stock * price;
    if (stock === 0) {
      outOfStockCount++;
    } else if (stock >= 1 && stock <= 10) {
      lowStockCount++;
      lowStockVariantsList.push({
        id: v.id as string & tags.Format<"uuid">,
        skuCode: v.sku_code,
        productName: v.product.name,
        quantity: stock as number & tags.Type<"int32"> & tags.Minimum<1>,
        price: v.price,
      });
    } else {
      inStockCount++;
    }
  }
  // Sort low stock variants by quantity ascending, take top 20
  lowStockVariantsList.sort((a, b) => a.quantity - b.quantity);
  const lowStockVariants = lowStockVariantsList.slice(0, 20);
  // Get recent inventory changes for seller's variants
  const recentChangesRaw =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: {
        ecommerce_mall_product_variant_id: { in: variantIds },
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
              select: { name: true },
            },
          },
        },
      },
    });
  const recentChanges: IEcommerceMallInventoryRecord.IRecentChange[] =
    recentChangesRaw.map((r) => ({
      quantityChange: r.quantity_change as number & tags.Type<"int32">,
      reason: r.reason,
      createdAt: r.created_at.toISOString() as string &
        tags.Format<"date-time">,
      variantSku: r.productVariant.sku_code,
      productName: r.productVariant.product.name,
    }));
  return {
    totalVariantsCount: allVariants.length as number & tags.Type<"int32">,
    totalStockQuantity: totalStockQuantity as number & tags.Type<"int32">,
    totalStockValue: totalStockValue,
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
// export async function postEcommerceMallSellerProductVariantsVariantIdInventoryRecords(props: {
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