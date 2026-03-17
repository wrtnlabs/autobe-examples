import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdVariantsVariantIdInventoryRecordId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.recordId },
      select: {
        id: true,
        product_variant_id: true,
        quantity_change: true,
        reason: true,
        reference_id: true,
        created_at: true,
        variant: {
          select: {
            product: {
              select: {
                shopping_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (record.product_variant_id !== props.variantId) {
    throw new HttpException("Not found", 404);
  }
  if (record.variant.product.shopping_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const recordWithVariant =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.recordId },
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  return await ShoppingMallInventoryRecordTransformer.transform(
    recordWithVariant,
  );
}
