import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryAutoConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryAutoConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallDeliveryAutoConfirmationTransformer {
  export type Payload =
    Prisma.shopping_mall_delivery_auto_confirmationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        confirmed_at: true,
        auto_confirmed_by: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_delivery_auto_confirmationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDeliveryAutoConfirmation> {
    return {
      id: input.id,
      shoppingMallShipmentId: input.shipment.id,
      confirmedAt: toISOStringSafe(input.confirmed_at),
      autoConfirmedBy: input.auto_confirmed_by,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
