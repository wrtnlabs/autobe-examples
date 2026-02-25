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

export async function patchShoppingMallCustomerShipmentConfirmations(props: {
  customer: CustomerPayload;
  body: IShoppingMallShipmentConfirmation.IUpdate;
}): Promise<IShoppingMallShipmentConfirmation> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const confirmation =
      await tx.shopping_mall_shipment_confirmations.findFirst({
        where: {
          deleted_at: null,
          shipment: {
            shipmentItems: {
              some: {
                orderItem: {
                  shopping_customer_id: props.customer.id,
                } as any,
              },
            },
          },
        },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      });
    if (!confirmation)
      throw new HttpException(
        "Shipment confirmation not found or forbidden",
        403,
      );
    const currentTimestampISO = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    await tx.shopping_mall_shipment_confirmations.update({
      where: { id: confirmation.id },
      data: {
        confirmed_at: props.body.confirmed_at,
        updated_at: currentTimestampISO,
      },
    });
    await tx.$executeRawUnsafe(
      `UPDATE shopping_mall_shipment_items SET status = 'delivered', updated_at = ? WHERE shopping_mall_shipment_id = ?`,
      currentTimestampISO,
      confirmation.shopping_mall_shipment_id,
    );
    await tx.shopping_mall_order_items.updateMany({
      where: {
        shipmentItems: {
          some: {
            shopping_mall_shipment_id: confirmation.shopping_mall_shipment_id,
          } as any,
        },
      },
      data: {
        status: "delivered" as any,
        updated_at: currentTimestampISO,
      },
    });
    const updatedConfirmation =
      await tx.shopping_mall_shipment_confirmations.findUniqueOrThrow({
        where: { id: confirmation.id },
        ...ShoppingMallShipmentConfirmationTransformer.select(),
      });
    return await ShoppingMallShipmentConfirmationTransformer.transform(
      updatedConfirmation,
    );
  });
}
