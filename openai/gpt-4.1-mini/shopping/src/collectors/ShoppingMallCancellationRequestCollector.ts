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
    return {
      id,
      reason: props.body.reason,
      seller_approval_status: "pending",
      seller_approval_reason: null,
      requested_at: new Date(),
      processed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.body.shoppingMallCustomerId } },
      orderItem: { connect: { id: props.body.shoppingMallOrderItemId } },
      // snapshots is hasMany relation, no creation here
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
