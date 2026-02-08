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

export async function putShoppingMallSellerProductVariantsVariantIdInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  inventoryHistoryId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.IUpdate;
}): Promise<IShoppingMallInventoryHistory> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
    });
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  const history =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findFirst({
      where: {
        id: props.inventoryHistoryId,
        shopping_mall_product_variant_id: props.variantId,
      },
    });
  if (!history) {
    throw new HttpException("Inventory history not found", 404);
  }
  // No fields to update in body, so just return the found record
  return history;
}
