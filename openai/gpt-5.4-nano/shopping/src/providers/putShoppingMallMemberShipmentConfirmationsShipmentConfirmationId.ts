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

export async function putShoppingMallMemberShipmentConfirmationsShipmentConfirmationId(props: {
  member: MemberPayload;
  shipmentConfirmationId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentConfirmation.IUpdate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const existingConfirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUniqueOrThrow(
      {
        where: { id: props.shipmentConfirmationId },
        select: {
          id: true,
          shopping_mall_shipment_id: true,
          deleted_at: true,
        },
      },
    );
  if (existingConfirmation.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const shipment =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: existingConfirmation.shopping_mall_shipment_id },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
      },
    });
  if (shipment.shopping_mall_order_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const confirmedAt = props.body.confirmed_at;
  const confirmationType = props.body.confirmation_type;
  if (confirmedAt === undefined || confirmedAt === null) {
    throw new HttpException("confirmed_at is required", 400);
  }
  if (
    confirmationType === undefined ||
    confirmationType === null ||
    confirmationType.trim().length === 0
  ) {
    throw new HttpException("confirmation_type is required", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.shopping_mall_shipment_confirmations.update({
      where: { id: props.shipmentConfirmationId },
      data: {
        confirmation_type: confirmationType,
        confirmed_at: toISOStringSafe(new Date(confirmedAt)),
        ...(props.body.tracking_url !== undefined && {
          tracking_url: props.body.tracking_url,
        }),
        ...(props.body.tracking_number !== undefined && {
          tracking_number: props.body.tracking_number,
        }),
        ...(props.body.carrier_name !== undefined && {
          carrier_name: props.body.carrier_name,
        }),
        ...(props.body.note !== undefined && { note: props.body.note }),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        confirmation_type: true,
        confirmed_at: true,
        tracking_url: true,
        tracking_number: true,
        carrier_name: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: { shopping_mall_shipment_id: updated.shopping_mall_shipment_id },
      select: { id: true, line_item_status: true },
    });
    for (const item of orderItems) {
      if (item.line_item_status === "delivered") {
        // no-op or forbidden depending on implied transition
      }
    }
    if (confirmationType === "delivered") {
      await tx.shopping_mall_order_items.updateMany({
        where: {
          shopping_mall_shipment_id: updated.shopping_mall_shipment_id,
        },
        data: {
          line_item_status: "delivered",
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
    const refreshed =
      await tx.shopping_mall_shipment_confirmations.findUniqueOrThrow({
        where: { id: props.shipmentConfirmationId },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      });
    return await ShoppingMallShipmentConfirmationTransformer.transform(
      refreshed,
    );
  });
}
