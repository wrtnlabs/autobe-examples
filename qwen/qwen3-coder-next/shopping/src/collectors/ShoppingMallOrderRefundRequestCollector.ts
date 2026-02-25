import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderRefundRequestCollector {
  export async function collect(props: {
    body: IShoppingMallOrderRefundRequest.ICreate;
    shoppingMallOrderItem: IEntity;
    shoppingMallCustomer: IEntity;
    shoppingMallCustomerSession: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      // BelongsTo relations (MUST use connect, relation name NOT table name)
      orderItem: { connect: { id: props.shoppingMallOrderItem.id } },
      customer: { connect: { id: props.shoppingMallCustomer.id } },
      seller: undefined,
      customerSession: {
        connect: { id: props.shoppingMallCustomerSession.id },
      },
      // HasMany relations (relation name NOT table name, reuse neighbor collectors)
      statusLogs: undefined,
      refundPayments: undefined,
    } satisfies Prisma.shopping_mall_order_refund_requestsCreateInput;
  }
}
