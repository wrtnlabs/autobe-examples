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
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    const id: string = v4();
    // Determine actor type from authenticated context
    // Customer takes precedence if both are present (typical auth pattern)
    const isCustomer = props.shoppingMallCustomers.id !== undefined;
    const actorType = isCustomer ? "customer" : "seller";
    const now = new Date();
    return {
      // Scalar fields
      id,
      actor_type: actorType,
      reason: props.body.reason,
      status: "pending",
      rejection_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // HasMany relation - omit (reverse relation)
      // HasOne relations - conditional based on actor type
      customerRequest: isCustomer
        ? {
            create: {
              id: v4(),
              customer: { connect: { id: props.shoppingMallCustomers.id } },
              customerSession: {
                connect: { id: props.shoppingMallCustomerSessions.id },
              },
              created_at: now,
              updated_at: now,
            },
          }
        : undefined,
      sellerRequest: !isCustomer
        ? {
            create: {
              id: v4(),
              seller: { connect: { id: props.shoppingMallSellers.id } },
              sellerSession: props.shoppingMallSellerSessions.id
                ? { connect: { id: props.shoppingMallSellerSessions.id } }
                : undefined,
            },
          }
        : undefined,
    } satisfies Prisma.shopping_mall_admin_promotion_requestsCreateInput;
  }
}
