import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function putShoppingMallSellerShipmentsShipmentId(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  const existingShipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUnique({
      where: { id: props.shipmentId },
      select: {
        id: true,
        seller_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!existingShipment) {
    throw new HttpException("Shipment not found", 404);
  }
  if (existingShipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedShipment = await MyGlobal.prisma.shopping_mall_shipments.update({
    where: { id: props.shipmentId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updatedShipment.id,
    seller_id: updatedShipment.seller_id,
    status: updatedShipment.status,
    created_at: toISOStringSafe(updatedShipment.created_at),
    updated_at: toISOStringSafe(updatedShipment.updated_at),
    deleted_at:
      updatedShipment.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedShipment.deleted_at),
  };
}
