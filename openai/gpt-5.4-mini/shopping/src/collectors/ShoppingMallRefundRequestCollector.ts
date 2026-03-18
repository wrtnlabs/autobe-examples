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
    orderItem: IEntity;
    customer: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      reviewed_at: null,
      reviewed_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      orderItem: { connect: { id: props.orderItem.id } },
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
