import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallShipmentAtSummaryTransformer } from "./ShoppingMallShipmentAtSummaryTransformer";

export namespace ShoppingMallShipmentLogTransformer {
  export type Payload = Prisma.shopping_mall_shipment_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        actor_type: true,
        actor_id: true,
        old_status: true,
        new_status: true,
        metadata: true,
        created_at: true,
        shipment: ShoppingMallShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_shipment_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallShipmentLog> {
    return {
      id: input.id,
      shipment: await ShoppingMallShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
      eventType: input.event_type,
      actorType: input.actor_type,
      actorId: input.actor_id ?? null,
      oldStatus: input.old_status ?? null,
      newStatus: input.new_status ?? null,
      metadata: input.metadata ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
