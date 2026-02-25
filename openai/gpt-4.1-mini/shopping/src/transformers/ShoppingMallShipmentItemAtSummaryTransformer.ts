import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallShipmentItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_shipment_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shipment_id: true,
        order_item_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipment_itemsFindManyArgs;
  }
  export async function transform(
    prisma: Payload,
  ): Promise<IShoppingMallShipmentItem.ISummary> {
    return {
      id: prisma.id,
      shipment_id: prisma.shipment_id,
      order_item_id: prisma.order_item_id,
      created_at: prisma.created_at.toISOString(),
      updated_at: prisma.updated_at.toISOString(),
      deleted_at: prisma.deleted_at?.toISOString() ?? null,
      shipment: await ShoppingMallShipmentAtSummaryTransformer.transform(
        prisma.shipment,
      ),
      orderItem: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        prisma.orderItem,
      ),
    };
  }
}
