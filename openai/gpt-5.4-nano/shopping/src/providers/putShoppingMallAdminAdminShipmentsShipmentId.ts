import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminShipmentsShipmentId(props: {
  admin: AdminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IUpdate;
}): Promise<IShoppingMallShipment> {
  await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
    ...ShoppingMallShipmentTransformer.select(),
  });
  const nextStatus = props.body.status;
  const wantsConfirmationUpdate =
    props.body.confirmation_type !== undefined ||
    props.body.confirmed_at !== undefined ||
    props.body.tracking_url !== undefined ||
    props.body.tracking_number !== undefined ||
    props.body.carrier_name !== undefined ||
    props.body.note !== undefined;
  const confirmationNeedsTypeOrTime =
    props.body.confirmation_type !== undefined ||
    props.body.confirmed_at !== undefined;
  if (confirmationNeedsTypeOrTime) {
    if (
      props.body.confirmation_type === undefined ||
      props.body.confirmed_at === undefined
    ) {
      throw new HttpException(
        "confirmation_type and confirmed_at are required when updating confirmation",
        400,
      );
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (nextStatus !== undefined) {
      await tx.shopping_mall_shipments.update({
        where: { id: props.shipmentId },
        data: { status: nextStatus },
      });
    }
    if (wantsConfirmationUpdate) {
      const existing = await tx.shopping_mall_shipment_confirmations.findUnique(
        {
          where: { shopping_mall_shipment_id: props.shipmentId },
          select: { id: true, deleted_at: true },
        },
      );
      const dataBase = {
        ...(props.body.confirmation_type !== undefined && {
          confirmation_type: props.body.confirmation_type,
        }),
        ...(props.body.confirmed_at !== undefined && {
          confirmed_at: toISOStringSafe(props.body.confirmed_at),
        }),
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
      };
      if (existing) {
        await tx.shopping_mall_shipment_confirmations.update({
          where: { id: existing.id },
          data: dataBase,
        });
      } else {
        await tx.shopping_mall_shipment_confirmations.create({
          data: {
            id: v4(),
            shopping_mall_shipment_id: props.shipmentId,
            confirmation_type: props.body.confirmation_type!,
            confirmed_at: toISOStringSafe(props.body.confirmed_at!),
            tracking_url: props.body.tracking_url ?? null,
            tracking_number: props.body.tracking_number ?? null,
            carrier_name: props.body.carrier_name ?? null,
            note: props.body.note ?? null,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
    if (nextStatus !== undefined) {
      if (nextStatus === "cancelled" || nextStatus === "refunded") {
        await tx.shopping_mall_order_items.updateMany({
          where: {
            shopping_mall_shipment_id: props.shipmentId,
            deleted_at: null,
          },
          data: { line_item_status: nextStatus },
        });
      }
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updated);
}
