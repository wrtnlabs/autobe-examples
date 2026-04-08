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

export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // 1. Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists (404 via findUniqueOrThrow)
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, quantity: true, ecommerce_mall_product_id: true },
    });
  // 3. Validate adjustment doesn't cause negative stock
  if (props.body.operationType === "adjustment") {
    if (variant.quantity < props.body.quantity) {
      throw new HttpException(
        `Insufficient stock for adjustment. Current: ${variant.quantity}, Requested: ${props.body.quantity}`,
        400,
      );
    }
  }
  // 4. Create inventory record using collector
  await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
    data: await EcommerceMallInventoryRecordCollector.collect({
      body: props.body,
      productVariant: { id: props.variantId },
    }),
  });
  // 5. Build aggregated response - get all variants for seller
  const allVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product: {
          ecommerce_mall_seller_id: props.seller.id,
        },
      },
      select: {
        id: true,
        quantity: true,
        price: true,
        sku_code: true,
        product: {
          select: { name: true },
        },
      },
    });
  // Calculate aggregated statistics
  const totalVariantsCount: number & tags.Type<"int32"> = allVariants.length;
  const totalStockQuantity: number & tags.Type<"int32"> = allVariants.reduce(
    (sum, v) => sum + v.quantity,
    0,
  );
  const totalStockValue: number = allVariants.reduce(
    (sum, v) => sum + v.quantity * (v.price ?? 0),
    0,
  );
  const outOfStockCount: number & tags.Type<"int32"> = allVariants.filter(
    (v) => v.quantity === 0,
  ).length;
  const lowStockCount: number & tags.Type<"int32"> = allVariants.filter(
    (v) => v.quantity >= 1 && v.quantity <= 10,
  ).length;
  const inStockCount: number & tags.Type<"int32"> = allVariants.filter(
    (v) => v.quantity > 10,
  ).length;
  // Low stock variants (1-10 units, max 20, ordered by quantity ascending)
  const lowStockVariantsData = allVariants
    .filter((v) => v.quantity >= 1 && v.quantity <= 10)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 20);
  const lowStockVariants: IEcommerceMallInventoryRecord.ILowStockVariant[] =
    lowStockVariantsData.map((v) => {
      const result: IEcommerceMallInventoryRecord.ILowStockVariant = {
        id: v.id,
        skuCode: v.sku_code,
        productName: v.product.name,
        quantity: v.quantity,
        price: v.price,
      };
      return result;
    });
  // Recent inventory changes (max 10, ordered by created_at descending)
  const recentRecords =
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
              select: { name: true },
            },
          },
        },
      },
    });
  const recentChanges: IEcommerceMallInventoryRecord.IRecentChange[] =
    recentRecords.map((r) => {
      const result: IEcommerceMallInventoryRecord.IRecentChange = {
        quantityChange: r.quantity_change,
        reason: r.reason,
        createdAt: r.created_at.toISOString() as string &
          tags.Format<"date-time">,
        variantSku: r.productVariant.sku_code,
        productName: r.productVariant.product.name,
      };
      return result;
    });
  return {
    totalVariantsCount,
    totalStockQuantity,
    totalStockValue,
    outOfStockCount,
    lowStockCount,
    inStockCount,
    lowStockVariants,
    recentChanges,
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
// export async function postEcommerceMallSellerProductsProductIdVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
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