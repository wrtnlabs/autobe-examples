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

export async function postShoppingMallMemberShipmentsShipmentIdConfirmations(props: {
  member: MemberPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  if (props.body.confirmationType.length === 0) {
    throw new HttpException("confirmationType is required", 400);
  }
  // Load shipment; if missing, OrThrow becomes 404
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: {
        id: true,
        status: true,
      },
    });
  // Business eligibility: basic (avoid overriding terminal states)
  if (shipment.status === "delivered") {
    throw new HttpException("Shipment is already delivered", 409);
  }
  const now = new globalThis.Date();
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const confirmation = await tx.shopping_mall_shipment_confirmations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_shipment_id: props.shipmentId,
        confirmation_type: props.body.confirmationType,
        confirmed_at: new globalThis.Date(
          props.body.confirmedAt as unknown as string,
        ),
        tracking_url:
          props.body.trackingUrl === undefined ? null : props.body.trackingUrl,
        tracking_number:
          props.body.trackingNumber === undefined
            ? null
            : props.body.trackingNumber,
        carrier_name:
          props.body.carrierName === undefined ? null : props.body.carrierName,
        note: props.body.note === undefined ? null : props.body.note,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: ShoppingMallShipmentConfirmationTransformer.select().select,
    });
    const nextStatus = props.body.confirmationType;
    await tx.shopping_mall_shipments.update({
      where: { id: shipment.id },
      data: {
        status: nextStatus,
        updated_at: now,
      },
    });
    return confirmation;
  });
  // created is already selected for transformer; transform it
  return await ShoppingMallShipmentConfirmationTransformer.transform(created);
}
