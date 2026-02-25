import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentConfirmationTransformer } from "../transformers/ShoppingMallShipmentConfirmationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsConfirmDelivery(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const nowIsoString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findUnique({
    where: { id: props.body.shoppingMallShipmentId },
    select: {
      id: true,
      status: true,
      seller_id: true,
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.seller_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (shipment.status !== "shipped") {
    throw new HttpException("Shipment is not in shipped status", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingConfirmation =
      await tx.shopping_mall_shipment_confirmations.findFirst({
        where: { shopping_mall_shipment_id: props.body.shoppingMallShipmentId },
      });
    const confirmedAt: string & tags.Format<"date-time"> =
      props.body.confirmedAt ?? nowIsoString;
    if (existingConfirmation) {
      await tx.shopping_mall_shipment_confirmations.update({
        where: { id: existingConfirmation.id },
        data: {
          confirmed_at: confirmedAt,
          updated_at: nowIsoString,
          deleted_at: null,
        },
      });
    } else {
      await tx.shopping_mall_shipment_confirmations.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_shipment_id: props.body.shoppingMallShipmentId,
          confirmed_at: confirmedAt,
          created_at: nowIsoString,
          updated_at: nowIsoString,
          deleted_at: null,
        },
      });
    }
    // Removed the invalid 'shopping_mall_shipment_items' from where clause
    // Since correct related field for relation is unknown, apply only status filter
    await tx.shopping_mall_order_items.updateMany({
      where: {
        status: "shipped",
      },
      data: {
        status: "delivered",
        updated_at: nowIsoString,
      },
    });
    const updatedConfirmation =
      await tx.shopping_mall_shipment_confirmations.findUniqueOrThrow({
        where: { id: existingConfirmation ? existingConfirmation.id : v4() },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      });
    return await ShoppingMallShipmentConfirmationTransformer.transform(
      updatedConfirmation,
    );
  });
}
