import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallPaymentTransformer } from "./ShoppingMallPaymentTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallOrderTransformer {
  export type Payload = Prisma.shopping_mall_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order_code: true,
        ship_to_name: true,
        ship_to_phone: true,
        ship_to_postal_code: true,
        ship_to_region: true,
        ship_to_city: true,
        ship_to_street_address: true,
        ship_to_detail_address: true,
        shipping_instructions: true,
        placed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ShoppingMallOrderAtSummaryTransformer.select(),
        payment: ShoppingMallPaymentTransformer.select(),
        orderItems: ShoppingMallOrderItemAtSummaryTransformer.select(),
        shipments: ShoppingMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_ordersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallOrder> {
    return {
      id: input.id,
      order_code: input.order_code,
      ship_to_name: input.ship_to_name,
      ship_to_phone: input.ship_to_phone,
      ship_to_postal_code: input.ship_to_postal_code,
      ship_to_region: input.ship_to_region,
      ship_to_city: input.ship_to_city,
      ship_to_street_address: input.ship_to_street_address,
      ship_to_detail_address: input.ship_to_detail_address,
      shipping_instructions: input.shipping_instructions ?? null,
      placed_at: input.placed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      customer: await ShoppingMallOrderAtSummaryTransformer.transform(
        input.customer as any,
      ),
      payment: await ShoppingMallPaymentTransformer.transform(input.payment),
      orderItems: await ArrayUtil.asyncMap(
        input.orderItems,
        ShoppingMallOrderItemAtSummaryTransformer.transform,
      ),
      shipments: await ArrayUtil.asyncMap(
        input.shipments,
        ShoppingMallShipmentAtSummaryTransformer.transform,
      ),
    };
  }
}
