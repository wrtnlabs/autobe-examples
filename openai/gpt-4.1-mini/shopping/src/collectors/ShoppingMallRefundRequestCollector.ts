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
    shoppingMallOrderItem: IEntity;
    shoppingMallCustomer: IEntity;
    shoppingMallSeller: IEntity;
  }) {
    return {
      id: v4(),
      request_reason: "",
      status: "",
      seller_response_reason: null,
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.shoppingMallOrderItem.id } },
      customer: { connect: { id: props.shoppingMallCustomer.id } },
      seller: { connect: { id: props.shoppingMallSeller.id } },
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
