import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import { IShoppingMallOrderShipmentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipmentAuditLog";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderShipmentAtSummaryTransformer } from "./ShoppingMallOrderShipmentAtSummaryTransformer";

export namespace ShoppingMallOrderShipmentAuditLogTransformer {
  export type Payload =
    Prisma.shopping_mall_order_shipment_audit_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        old_status: true,
        new_status: true,
        actor_type: true,
        actor_id: true,
        ip: true,
        href: true,
        notes: true,
        created_at: true,
        shipment: ShoppingMallOrderShipmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_shipment_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderShipmentAuditLog> {
    return {
      id: input.id,
      event_type: input.event_type,
      old_status: input.old_status ?? undefined,
      new_status: input.new_status,
      actor_type: input.actor_type,
      actor_id: input.actor_id ?? undefined,
      ip: input.ip ?? undefined,
      href: input.href ?? undefined,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
      shipment: await ShoppingMallOrderShipmentAtSummaryTransformer.transform(
        input.shipment,
      ),
    };
  }
}
