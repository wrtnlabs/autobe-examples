import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderRefundCollector {
  export async function collect(props: {
    body: IShoppingMallOrderRefund.ICreate;
    shoppingMallOrders: IEntity;
  }) {
    return {
      id: v4(),
      amount: props.body.refund_amount,
      status: "pending",
      refund_method: "original",
      gateway_reference_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderReturn: {
        create: {
          id: v4(),
          returnItems: props.body.return_items,
          reason: props.body.reason,
          reason_code: props.body.return_reason_code,
          ship_method: props.body.return_ship_method,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      },
      order: {
        connect: { id: props.shoppingMallOrders.id },
      },
    } satisfies Prisma.shopping_mall_order_refundsCreateInput;
  }
}
