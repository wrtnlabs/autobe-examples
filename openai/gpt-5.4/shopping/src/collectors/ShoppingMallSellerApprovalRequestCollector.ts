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
    seller: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: props.body.reason ?? null,
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: {
          id: props.seller.id,
        },
      },
      reviewer: undefined,
    } satisfies Prisma.shopping_mall_seller_approval_requestsCreateInput;
  }
}
