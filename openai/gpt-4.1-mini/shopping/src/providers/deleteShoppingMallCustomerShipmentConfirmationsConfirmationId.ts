import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallCustomerShipmentConfirmationsConfirmationId(props: {
  customer: CustomerPayload;
  confirmationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const exists =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUnique({
      where: { id: props.confirmationId },
      select: { id: true },
    });
  if (!exists) {
    throw new HttpException("Shipment confirmation not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_shipment_confirmations.delete({
    where: { id: props.confirmationId },
  });
}
