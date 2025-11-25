import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerInventoryUnitsUnitId(props: {
  seller: SellerPayload;
  unitId: string;
}): Promise<void> {
  const unit = await MyGlobal.prisma.shopping_mall_inventory_units.findUnique({
    where: { id: props.unitId, seller_id: props.seller.id },
  });

  if (!unit) {
    throw new HttpException("Inventory unit not found", 404);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_inventory_reservations.deleteMany({
      where: { inventory_unit_id: props.unitId },
    }),
    MyGlobal.prisma.shopping_mall_inventory_units.delete({
      where: { id: props.unitId },
    }),
  ]);
}
