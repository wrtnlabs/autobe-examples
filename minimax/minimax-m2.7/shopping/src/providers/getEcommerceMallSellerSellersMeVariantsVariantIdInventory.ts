import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function getEcommerceMallSellerSellersMeVariantsVariantIdInventory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallInventoryRecord.IInvert[]> {
  // Verify variant exists and belongs to authenticated seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        quantity: true,
        ecommerce_mall_product_id: true,
        created_at: true,
        updated_at: true,
        product: {
          select: {
            id: true,
            ecommerce_mall_seller_id: true,
          },
        },
      },
    });
  // Verify ownership - seller must own the product containing this variant
  if (variant.product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query inventory records for this variant (ordered by most recent first)
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      orderBy: { created_at: "desc" },
    });
  // Calculate current_stock by summing all quantity_change values for the variant
  const currentStockResult =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.aggregate({
      where: { ecommerce_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const currentStock: number & tags.Type<"int32"> = (currentStockResult._sum
    .quantity_change ?? 0) as number & tags.Type<"int32">;
  // Build variant summary for response
  const variantSummary: IEcommerceMallProductVariant.ISummary = {
    id: variant.id,
    skuCode: variant.sku_code,
    price: variant.price,
    quantity: variant.quantity,
    productId: variant.ecommerce_mall_product_id,
    createdAt: variant.created_at.toISOString(),
    updatedAt: variant.updated_at.toISOString(),
  } satisfies IEcommerceMallProductVariant.ISummary;
  // Transform records to response DTOs with computed current_stock
  return records.map(
    (record): IEcommerceMallInventoryRecord.IInvert => ({
      id: record.id as string & tags.Format<"uuid">,
      quantityChange: record.quantity_change as number & tags.Type<"int32">,
      reason: record.reason,
      createdAt: record.created_at.toISOString(),
      currentStock: currentStock,
      variant: variantSummary,
    }),
  );
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellersMeVariantsVariantIdInventory(props: {
//   seller: SellerPayload;
//   variantId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallInventoryRecord.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_inventory_records.findFirstOrThrow({
//     ...EcommerceMallInventoryRecordAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallInventoryRecordAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------