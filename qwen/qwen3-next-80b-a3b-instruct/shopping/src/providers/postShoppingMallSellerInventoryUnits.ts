import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerInventoryUnits(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryUnit.ICreate;
}): Promise<IShoppingMallInventoryUnit> {
  // Parse the JSON string body to extract inventory data
  const inventoryData = JSON.parse(props.body);

  // Validate required properties exist
  if (!inventoryData.product_variant_id || !inventoryData.quantity) {
    throw new HttpException("Missing required inventory unit information", 400);
  }

  const inventoryUnit =
    await MyGlobal.prisma.shopping_mall_inventory_units.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_variant_id: inventoryData.product_variant_id,
        seller_id: props.seller.id,
        quantity: inventoryData.quantity,
        min_stock_threshold: inventoryData.min_stock_threshold ?? 0,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        last_updated: toISOStringSafe(new Date()),
      },
    });

  // IShoppingMallInventoryUnit is defined as string, so we must return the ID as a string
  return inventoryUnit.id;
}
