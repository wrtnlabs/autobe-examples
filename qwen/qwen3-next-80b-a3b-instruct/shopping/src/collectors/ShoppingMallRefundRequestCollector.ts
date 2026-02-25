import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallRefundRequestCollector {
  export async function collect(props: {
    body: IShoppingMallRefundRequest.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      response_reason: null,
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.body.order_item_id } },
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      responder: undefined,
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
