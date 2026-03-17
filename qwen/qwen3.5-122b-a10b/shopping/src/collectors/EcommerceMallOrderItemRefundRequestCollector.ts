import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderItemRefundRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallOrderItemRefundRequest.ICreate;
    ecommerceMallOrderItems: IEntity;
  }) {
    const id: string = v4();
    // Query order item to get created_at for days_since_delivery calculation
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.ecommerceMallOrderItems.id },
      });
    // Calculate days since creation (fallback since delivered_at doesn't exist)
    const daysSinceDelivery = Math.floor(
      (new Date().getTime() - new Date(orderItem.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      requested_at: new Date(),
      responded_at: null,
      days_since_delivery: daysSinceDelivery,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.ecommerceMallOrderItems.id } },
    } satisfies Prisma.ecommerce_mall_order_item_refund_requestsCreateInput;
  }
}
