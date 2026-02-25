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
    seller: IEntity;
  }) {
    const id = v4();
    return {
      id,
      request_reason: props.body.requestReason,
      status: "pending",
      seller_response_reason: null,
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: { connect: { id: props.body.shoppingMallOrderItemId } },
      customer: { connect: { id: props.customer.id } },
      seller: { connect: { id: props.seller.id } },
      // No nested create for refundRequestSnapshots
    } satisfies Prisma.shopping_mall_refund_requestsCreateInput;
  }
}
