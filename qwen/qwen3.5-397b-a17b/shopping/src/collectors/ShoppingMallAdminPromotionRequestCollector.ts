import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdminPromotionRequestCollector {
  export async function collect(props: {
    body: IShoppingMallAdminPromotionRequest.ICreate;
    shoppingMallMembers: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallMemberSessions: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    // Determine actor type based on which entity has valid id
    const isMember = props.shoppingMallMembers.id !== undefined;
    const actorType: string = isMember ? "member" : "seller";
    return {
      // Scalar fields
      id,
      actor_type: actorType,
      reason: props.body.reason,
      status: "pending",
      rejection_note: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (nullable, not set on create)
      reviewer: undefined,
      // HasOne relations - create subtype record based on actor type
      memberApplicant: isMember
        ? {
            create: {
              id: v4(),
              shopping_mall_member_id: props.shoppingMallMembers.id,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          }
        : undefined,
      sellerApplicant: !isMember
        ? {
            create: {
              id: v4(),
              shopping_mall_seller_id: props.shoppingMallSellers.id,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          }
        : undefined,
    } satisfies Prisma.shopping_mall_admin_promotion_requestsCreateInput;
  }
}
