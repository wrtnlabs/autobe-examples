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
    const id: string = v4();
    return {
      // Scalar fields
      id,
      status: "pending",
      rejection_reason: null,
      submitted_at: new Date(),
      reviewed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.seller.id } },
      reviewingAdministrator: undefined,
      // HasMany relations
      snapshots: undefined,
    } satisfies Prisma.shopping_mall_seller_approval_requestsCreateInput;
  }
}
