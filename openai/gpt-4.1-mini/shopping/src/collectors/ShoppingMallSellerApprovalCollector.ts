import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerApprovalCollector {
  export async function collect(props: {
    body: IShoppingMallSellerApproval.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "pending", // default initial status
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_seller_approvalsCreateInput;
  }
}
