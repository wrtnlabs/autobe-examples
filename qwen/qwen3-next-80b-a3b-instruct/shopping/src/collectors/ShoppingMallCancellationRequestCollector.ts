import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequest.ICreate;
    shoppingMallCustomers: IEntity; // from authorized actor
    shoppingMallCustomerSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      reason: "Customer requested cancellation",
      status: "pending",
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      responder: props.shoppingMallCustomers
        ? {
            connect: { id: props.shoppingMallCustomers.id },
          }
        : undefined,
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
