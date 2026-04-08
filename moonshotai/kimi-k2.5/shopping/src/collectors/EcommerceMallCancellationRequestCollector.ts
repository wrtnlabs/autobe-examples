import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCancellationRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallCancellationRequest.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    // Indirect reference: Query order item to get seller_id
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
      });
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      response_reason: null,
      responded_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: { connect: { id: props.body.orderItemId } },
      customer: { connect: { id: props.customer.id } },
      seller: orderItem.seller_id
        ? { connect: { id: orderItem.seller_id } }
        : undefined,
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}
