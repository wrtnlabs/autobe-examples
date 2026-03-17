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
    return {
      id: v4(),
      status: "pending",
      reason: props.body.reason.trim(),
      reviewed_by_type: null,
      reviewed_at: null,
      decision_note: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: {
        connect: {
          id: props.body.shopping_mall_order_item_id,
        },
      },
      customer: {
        connect: {
          id: props.customer.id,
        },
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
