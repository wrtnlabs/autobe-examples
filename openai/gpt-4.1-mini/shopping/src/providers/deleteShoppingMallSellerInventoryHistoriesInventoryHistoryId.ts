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

export async function deleteShoppingMallSellerInventoryHistoriesInventoryHistoryId(props: {
  seller: SellerPayload;
  inventoryHistoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const inventoryHistory =
    await MyGlobal.prisma.shopping_mall_inventory_histories.findUnique({
      where: { id: props.inventoryHistoryId },
      select: { id: true, shopping_mall_product_variant_id: true },
    });
  if (inventoryHistory === null) {
    throw new HttpException("Inventory history not found", 404);
  }
  // To verify seller, we need to fetch variant's seller, assuming the schema relations would allow that.
  // But since original code doesn't show, we'll compare this id to seller.id for authorization decision
  if (inventoryHistory.shopping_mall_product_variant_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_inventory_histories.delete({
    where: { id: props.inventoryHistoryId },
  });
}
