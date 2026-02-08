import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallShipmentConfirmationCollector } from "../collectors/ShoppingMallShipmentConfirmationCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentConfirmations(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipmentConfirmation.ICreate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const shipmentId = (props.body as any).shopping_mall_shipment_id;
  if (typeof shipmentId !== "string") {
    throw new HttpException("Invalid shopping mall shipment id", 400);
  }
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: shipmentId,
      deleted_at: null,
    },
  });
  if (!shipment) {
    throw new HttpException("Shipment not found", 404);
  }
  const existingConfirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findFirst({
      where: {
        shopping_mall_shipment_id: shipmentId,
        deleted_at: null,
      },
    });
  if (existingConfirmation) {
    throw new HttpException("Shipment already confirmed", 409);
  }
  const confirmationInput =
    await ShoppingMallShipmentConfirmationCollector.collect({
      body: props.body,
      shipment,
      confirmedAt: (props.body as any).confirmed_at ?? null,
    });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    return await tx.shopping_mall_shipment_confirmations.create({
      data: confirmationInput,
    });
  });
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_shipment_id: created.shopping_mall_shipment_id as string &
      tags.Format<"uuid">,
    confirmed_at: toISOStringSafe(created.confirmed_at) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at === null
        ? null
        : (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">),
  };
}
