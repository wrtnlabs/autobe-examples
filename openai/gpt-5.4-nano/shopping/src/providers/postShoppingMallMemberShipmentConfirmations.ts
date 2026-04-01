import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberShipmentConfirmations(props: {
  member: MemberPayload;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.body.shoppingMallShipmentId },
    select: {
      id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (shipment === null || shipment.deleted_at !== null) {
    throw new HttpException("Shipment not found", 404);
  }
  const normalizedConfirmationType = props.body.confirmationType;
  if (
    shipment.status === "delivered" &&
    normalizedConfirmationType !== "delivered"
  ) {
    throw new HttpException("Shipment already delivered", 409);
  }
  const targetLineItemStatus =
    normalizedConfirmationType === "delivered"
      ? "delivered"
      : normalizedConfirmationType === "shipped"
        ? "shipped"
        : null;
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const confirmation = await tx.shopping_mall_shipment_confirmations.create({
      data: {
        id: v4(),
        confirmed_at: toISOStringSafe(props.body.confirmedAt as any),
        confirmation_type: props.body.confirmationType,
        tracking_url:
          props.body.trackingUrl === undefined ||
          props.body.trackingUrl === null
            ? null
            : props.body.trackingUrl,
        tracking_number:
          props.body.trackingNumber === undefined ||
          props.body.trackingNumber === null
            ? null
            : props.body.trackingNumber,
        carrier_name:
          props.body.carrierName === undefined ||
          props.body.carrierName === null
            ? null
            : props.body.carrierName,
        note:
          props.body.note === undefined || props.body.note === null
            ? null
            : props.body.note,
        created_at: toISOStringSafe(new globalThis.Date()),
        updated_at: toISOStringSafe(new globalThis.Date()),
        deleted_at: null,
        shopping_mall_shipment_id: props.body.shoppingMallShipmentId!,
      },
      ...ShoppingMallShipmentConfirmationTransformer.select(),
    });
    if (targetLineItemStatus !== null) {
      await tx.shopping_mall_order_items.updateMany({
        where: {
          shopping_mall_shipment_id: props.body.shoppingMallShipmentId!,
          deleted_at: null,
        },
        data: {
          line_item_status: targetLineItemStatus,
          updated_at: toISOStringSafe(new globalThis.Date()),
        },
      });
    }
    return confirmation;
  });
  return ShoppingMallShipmentConfirmationTransformer.transform(created as any);
}
