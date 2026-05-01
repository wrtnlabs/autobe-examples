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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, shopping_mall_seller_id: true, deleted_at: true },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
        code: true,
        price: true,
      },
    });
  if (
    variant.shopping_mall_product_id !== props.productId ||
    variant.deleted_at !== null
  ) {
    throw new HttpException("Variant not found", 404);
  }
  const optionValue =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findUniqueOrThrow(
      {
        where: { id: props.optionId },
        select: { id: true, shopping_mall_product_variant_id: true },
      },
    );
  if (optionValue.shopping_mall_product_variant_id !== props.variantId) {
    throw new HttpException("Option value not found", 404);
  }
  const inventorySum =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: { shopping_mall_product_variant_id: props.variantId },
      _sum: { quantity_change: true },
    });
  const stockQuantity: number = inventorySum._sum.quantity_change ?? 0;
  await MyGlobal.prisma.shopping_mall_product_variant_option_values.delete({
    where: { id: props.optionId },
  });
  const remainingOptionValues =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findMany({
      where: { shopping_mall_product_variant_id: props.variantId },
      select: { key: true, value: true },
    });
  const optionValuesStr: string = remainingOptionValues
    .map((ov) => `${ov.key}: ${ov.value}`)
    .join(", ");
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
    data: {
      id: v4(),
      variant: { connect: { id: props.variantId } },
      sku_code: variant.code,
      option_values: optionValuesStr,
      price: variant.price,
      stock_quantity: stockQuantity,
      created_at: new Date().toISOString(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteShoppingMallSellerProductsProductIdVariantsVariantIdOptionsOptionId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   optionId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------