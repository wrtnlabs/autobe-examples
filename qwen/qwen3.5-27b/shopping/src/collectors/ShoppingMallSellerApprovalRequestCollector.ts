import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerApprovalRequestCollector {
  export async function collect(props: {
    body: IShoppingMallSellerApprovalRequest.ICreate;
    shoppingMallSellers: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      status: "pending",
      submitted_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.shoppingMallSellers.id } },
    } satisfies Prisma.shopping_mall_seller_approval_requestsCreateInput;
  }
}
