import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallOrderEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEvent";
import { IShoppingMallOrderEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEventMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderEventTransformer {
  export type Payload = Prisma.shopping_mall_order_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        actor_type: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
            code: true,
            event_code: true,
            event_type: true,
            actor_id: true,
            source_system: true,
            is_system_generated: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_order_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderEvent> {
    return {
      id: input.id,
      order_code: input.order.code,
      event_code: input.order.event_code,
      event_type: input.order.event_type,
      status: input.status,
      description: input.details ?? undefined,
      metadata: input.details ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      actor_type: input.actor_type,
      actor_id: input.order.actor_id,
      source_system: input.order.source_system,
      is_system_generated: input.order.is_system_generated,
    };
  }
}
