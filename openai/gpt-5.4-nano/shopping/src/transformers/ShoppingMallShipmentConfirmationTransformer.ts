import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallShipmentConfirmationTransformer {
  export type Payload = Prisma.shopping_mall_shipment_confirmationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        shipment: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_shipment_confirmationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipmentConfirmation> {
    return {
      id: input.id,
      shopping_mall_shipment_id: input.shopping_mall_shipment_id,
      confirmation_type: input.confirmation_type,
      confirmed_at: input.confirmed_at.toISOString(),
      tracking_url: input.tracking_url ?? null,
      tracking_number: input.tracking_number ?? null,
      carrier_name: input.carrier_name ?? null,
      note: input.note ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
