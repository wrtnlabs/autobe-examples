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

export async function deleteShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ownership
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { seller_id: true },
    });
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete shipment with transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // delete shipment order items (cascade handled by DB but explicit for clarity and potential audit)
    await tx.shopping_mall_shipment_order_items.deleteMany({
      where: { shopping_mall_shipment_id: props.shipmentId },
    });
    // delete the shipment
    await tx.shopping_mall_shipments.delete({
      where: { id: props.shipmentId },
    });
  });
}
