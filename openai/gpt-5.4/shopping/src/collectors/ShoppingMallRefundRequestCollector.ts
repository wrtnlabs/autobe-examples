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
    customer: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      reviewer_role: null,
      review_note: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
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
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
