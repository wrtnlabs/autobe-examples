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
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      reason: props.body.reason,
      requested_at: now,
      status: "pending",
      seller_decisioned_at: null,
      seller_response_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: {
        connect: { id: props.body.orderItemId },
      },
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
