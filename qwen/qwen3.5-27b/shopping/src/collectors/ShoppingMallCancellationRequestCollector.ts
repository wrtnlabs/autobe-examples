import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequest.ICreate;
    customer: IEntity;
  }) {
    const id: string = v4();
    // Query the order item to establish the relation
    const orderItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
        where: { id: props.body.orderItemId },
      });
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: orderItem.id } },
      customer: { connect: { id: props.customer.id } },
      seller: undefined,
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
