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

export async function putShoppingMallCustomerShipmentConfirmationsConfirmationId(props: {
  customer: CustomerPayload;
  confirmationId: string & tags.Format<"uuid">;
  body: IShoppingMallShipmentConfirmation.IUpdate;
}): Promise<IShoppingMallShipmentConfirmation> {
  const { customer, confirmationId, body } = props;
  const confirmation =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.findUnique({
      where: { id: confirmationId },
      select: {
        id: true,
        shopping_mall_shipment_id: true,
        confirmed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!confirmation) {
    throw new HttpException("Shipment confirmation not found", 404);
  }
  if ("confirmed_at" in body) {
    const confirmedAt = body.confirmed_at;
    if (typeof confirmedAt === "string") {
      const iso8601regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
      if (!iso8601regex.test(confirmedAt)) {
        throw new HttpException(
          "Invalid confirmed_at format, expecting ISO 8601 UTC date-time string",
          400,
        );
      }
      if (confirmedAt > toISOStringSafe(new Date())) {
        throw new HttpException("confirmed_at cannot be in the future", 400);
      }
    } else if (confirmedAt !== null) {
      throw new HttpException(
        "confirmed_at must be either a valid ISO 8601 string or null",
        400,
      );
    }
  }
  type UpdateData = Partial<{
    confirmed_at: string | null;
    updated_at: string;
  }>;
  const dataToUpdate: UpdateData = {
    updated_at: toISOStringSafe(new Date()),
  };
  if ("confirmed_at" in body) {
    const confirmedAt = body.confirmed_at;
    if (typeof confirmedAt === "string" || confirmedAt === null) {
      dataToUpdate.confirmed_at = confirmedAt;
    }
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_shipment_confirmations.update({
      where: { id: confirmationId },
      data: dataToUpdate as Prisma.shopping_mall_shipment_confirmationsUpdateInput,
    });
  return updated;
}
