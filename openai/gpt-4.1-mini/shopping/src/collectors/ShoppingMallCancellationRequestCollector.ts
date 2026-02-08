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
    orderItem: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: "",
      seller_approval_status: "",
      seller_approval_reason: null,
      requested_at: new Date(),
      processed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      orderItem: { connect: { id: props.orderItem.id } },
    } satisfies Prisma.shopping_mall_cancellation_requestsCreateInput;
  }
}
