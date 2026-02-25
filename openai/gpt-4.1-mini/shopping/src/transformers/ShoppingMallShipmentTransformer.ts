import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallShipmentTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      sellerId: input.seller_id,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        seller_id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipmentItems: {
          select: {},
        } satisfies Prisma.shopping_mall_shipment_itemsFindManyArgs,
        shipmentOrderItems: {
          select: {},
        } satisfies Prisma.shopping_mall_shipment_order_itemsFindManyArgs,
        shipmentTrackings: {
          select: {},
        } satisfies Prisma.shopping_mall_shipment_trackingsFindManyArgs,
        shipmentConfirmations: {
          select: {},
        } satisfies Prisma.shopping_mall_shipment_confirmationsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
}
