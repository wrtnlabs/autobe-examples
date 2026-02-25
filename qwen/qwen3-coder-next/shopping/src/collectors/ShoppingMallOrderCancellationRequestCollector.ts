import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallOrderCancellationRequest.ICreate;
    shoppingMallOrderItems: IEntity;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason ?? null,
      status: "pending",
      rejection_reason: null,
      created_at: new Date(),
      responded_at: null,
      deleted_at: null,
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      seller: undefined,
      logs: undefined,
    } satisfies Prisma.shopping_mall_order_cancellation_requestsCreateInput;
  }
}
