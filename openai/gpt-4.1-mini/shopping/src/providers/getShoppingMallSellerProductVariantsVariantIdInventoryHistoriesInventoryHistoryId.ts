import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
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

export async function getShoppingMallSellerProductVariantsVariantIdInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryHistoryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryHistory> {
  const inventoryHistory =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findFirst({
      where: {
        id: props.inventoryHistoryId,
        shopping_mall_product_variant_id: props.variantId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity_delta: true,
        reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!inventoryHistory) {
    throw new HttpException("Inventory history not found", 404);
  }
  return {
    id: inventoryHistory.id,
    shopping_mall_product_variant_id:
      inventoryHistory.shopping_mall_product_variant_id,
    quantity_delta: inventoryHistory.quantity_delta,
    reason: inventoryHistory.reason === null ? null : inventoryHistory.reason,
    created_at: inventoryHistory.created_at,
    updated_at: inventoryHistory.updated_at,
  };
}
