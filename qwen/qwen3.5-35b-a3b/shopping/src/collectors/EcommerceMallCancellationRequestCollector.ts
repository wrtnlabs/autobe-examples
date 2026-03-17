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
    ecommerceMallCustomers: IEntity;
  }) {
    const id: string = v4();
    // Query order_item to get seller_snapshot_id (required for seller relation)
    const orderItem =
      await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_id },
      });
    return {
      id,
      status: "pending",
      reason: props.body.reason,
      seller_response: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: orderItem.id } },
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      seller: { connect: { id: orderItem.seller_snapshot_id } },
    } satisfies Prisma.ecommerce_mall_cancellation_requestsCreateInput;
  }
}
