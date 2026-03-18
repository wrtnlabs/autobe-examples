import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerApprovalRequestReviewCollector {
  export async function collect(props: {
    body: IShoppingMallSellerApprovalRequestReview.ICreate;
    sellerApprovalRequest: IEntity;
    administrator: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      decision: props.body.decision,
      reviewed_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sellerApprovalRequest: {
        connect: { id: props.sellerApprovalRequest.id },
      },
      administrator: { connect: { id: props.administrator.id } },
    } satisfies Prisma.shopping_mall_seller_approval_request_reviewsCreateInput;
  }
}
