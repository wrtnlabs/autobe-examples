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
    customerSession: IEntity;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      customer_reason: "",
      requested_refund_amount: 0,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      resolved_at: null,
      deleted_at: null,
      orderItem: { connect: { id: props.orderItem.id } },
      customer: { connect: { id: props.customer.id } },
      customerSession: { connect: { id: props.customerSession.id } },
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
