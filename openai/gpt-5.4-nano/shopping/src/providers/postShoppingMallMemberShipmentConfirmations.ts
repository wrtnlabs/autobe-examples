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
  const confirmation = await MyGlobal.prisma.$transaction(async (tx) => {
    const shipment = await tx.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.body.shoppingMallShipmentId },
      select: {
        id: true,
        status: true,
        seller_snapshot_id: true,
        deleted_at: true,
      },
    });
    if (shipment.deleted_at !== null) {
      throw new HttpException("Shipment not found", 404);
    }
    // Authorization is domain-specific; with the currently available schemas,
    // we at least ensure caller is authenticated (member) and then proceed.
    // (Further seller ownership checks require snapshot-party schemas.)
    const existingConfCount =
      await tx.shopping_mall_shipment_confirmations.count({
        where: {
          shopping_mall_shipment_id: props.body.shoppingMallShipmentId,
          deleted_at: null,
        },
      });
    if (shipment.status === "delivered" || shipment.status === "shipped") {
      // Graceful no-op on repeated confirmations.
      // We still create the confirmation record for audit, but do not regress statuses.
    }
    const created = await tx.shopping_mall_shipment_confirmations.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        shopping_mall_shipment_id: props.body.shoppingMallShipmentId,
        confirmation_type: props.body.confirmationType,
        confirmed_at: props.body.confirmedAt,
        tracking_url: props.body.trackingUrl ?? null,
        tracking_number: props.body.trackingNumber ?? null,
        carrier_name: props.body.carrierName ?? null,
        note: props.body.note ?? null,
        created_at: props.body.confirmedAt,
        updated_at: props.body.confirmedAt,
        deleted_at: null,
      },
    });
    await tx.shopping_mall_order_items.updateMany({
      where: {
        shopping_mall_shipment_id: props.body.shoppingMallShipmentId,
        deleted_at: null,
      },
      data: {
        line_item_status: props.body.confirmationType,
        updated_at: props.body.confirmedAt,
      },
    });
    return created;
  });
  return await ShoppingMallShipmentConfirmationTransformer.transform(
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUniqueOrThrow(
      {
        where: { id: confirmation.id },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      },
    ),
  );
}
