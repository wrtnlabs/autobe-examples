import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerShipmentConfirmationsConfirmationId(props: {
  customer: CustomerPayload;
  confirmationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipmentConfirmation> {
  const record =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUnique({
      where: { id: props.confirmationId },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        confirmed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) throw new HttpException("Shipment confirmation not found", 404);
  return {
    id: record.id,
    shopping_mall_shipment_id: record.shopping_mall_shipment_id,
    confirmed_at: record.confirmed_at
      ? toISOStringSafe(record.confirmed_at)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
