import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallShipmentTransformer {
  export type Payload = Prisma.shopping_mall_shipmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        tracking_number: true,
        tracking_carrier: true,
        status: true,
        shipped_at: true,
        customer_confirmed_at: true,
        auto_confirmed_at: true,
        cancelled_at: true,
        shopping_mall_order_id: true,
        shopping_mall_seller_id: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        deliveryConfirmations: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_delivery_confirmationsFindManyArgs,
        items: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_shipment_itemsFindManyArgs,
        statusLogs: {
          select: { id: true, status: true },
        } satisfies Prisma.shopping_mall_shipment_status_logsFindManyArgs,
        autoConfirmations: {
          select: { id: true, confirmed_at: true },
        } satisfies Prisma.shopping_mall_delivery_auto_confirmationsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_shipmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipment> {
    return {
      id: input.id,
      shoppingMallOrderId: input.shopping_mall_order_id,
      shoppingMallSellerId: input.shopping_mall_seller_id,
      trackingNumber: input.tracking_number,
      trackingCarrier: input.tracking_carrier,
      status: input.status,
      shippedAt: toISOStringSafe(input.shipped_at),
      customerConfirmedAt: input.customer_confirmed_at
        ? toISOStringSafe(input.customer_confirmed_at)
        : null,
      autoConfirmedAt: input.auto_confirmed_at
        ? toISOStringSafe(input.auto_confirmed_at)
        : null,
      cancelledAt: input.cancelled_at
        ? toISOStringSafe(input.cancelled_at)
        : null,
      createdAt: toISOStringSafe(new Date()),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
