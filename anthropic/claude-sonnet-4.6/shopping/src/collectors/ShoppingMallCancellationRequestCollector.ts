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
    shoppingMallOrders: IEntity;
    shoppingMallOrderItems: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.shoppingMallOrderItems.id } },
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
