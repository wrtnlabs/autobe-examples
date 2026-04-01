import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";

export namespace ShoppingMallShipmentAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        seller_snapshot_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        shipmentConfirmation: {
          select: {
            tracking_url: true,
            tracking_number: true,
            carrier_name: true,
            confirmation_type: true,
            confirmed_at: true,
            deleted_at: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment.ISummary> {
    return {
      id: input.id,
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      sellerSnapshotId: input.seller_snapshot_id,
      status: input.status,
      trackingUrl:
        input.shipmentConfirmation?.deleted_at === null
          ? (input.shipmentConfirmation.tracking_url ?? null)
          : null,
      trackingNumber:
        input.shipmentConfirmation?.deleted_at === null
          ? (input.shipmentConfirmation.tracking_number ?? null)
          : null,
      carrierName:
        input.shipmentConfirmation?.deleted_at === null
          ? (input.shipmentConfirmation.carrier_name ?? null)
          : null,
      confirmationType:
        input.shipmentConfirmation?.deleted_at === null
          ? (input.shipmentConfirmation.confirmation_type ?? null)
          : null,
      confirmedAt:
        input.shipmentConfirmation?.deleted_at === null
          ? input.shipmentConfirmation.confirmed_at.toISOString()
          : null,
      createdAt: input.created_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
