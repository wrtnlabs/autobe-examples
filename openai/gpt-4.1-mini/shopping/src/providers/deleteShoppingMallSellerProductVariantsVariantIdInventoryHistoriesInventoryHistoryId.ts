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

export async function deleteShoppingMallSellerProductVariantsVariantIdInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryHistoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const variant = await tx.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        deleted_at: true,
        product: {
          select: {
            seller_id: true,
          },
        },
      },
    });
    if (
      !variant ||
      variant.deleted_at !== null ||
      !variant.product ||
      variant.product.seller_id !== props.seller.id
    ) {
      throw new HttpException("Variant not found", 404);
    }
    const inventoryHistory =
      await tx.shopping_mall_inventory_histories.findUnique({
        where: { id: props.inventoryHistoryId },
      });
    if (
      !inventoryHistory ||
      inventoryHistory.shopping_mall_product_variant_id !== props.variantId
    ) {
      throw new HttpException("Inventory history not found", 404);
    }
    await tx.shopping_mall_inventory_histories.delete({
      where: { id: props.inventoryHistoryId },
    });
  });
}
