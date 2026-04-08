import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerProfileAtSummaryTransformer } from "./ShoppingMallCustomerProfileAtSummaryTransformer";

export namespace ShoppingMallMemberAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        adminProfile: true,
        customerProfile:
          ShoppingMallCustomerProfileAtSummaryTransformer.select(),
        administrator: true,
        adminPromotionRequests: true,
        wishlistItems: true,
        cart: true,
        orders: true,
        orderItemCancellationRequests: true,
        deliveredItemRefundRequests: true,
        postPurchaseCancellationRequests: true,
        postPurchaseRefundRequests: true,
        reviews: true,
      },
    } satisfies Prisma.shopping_mall_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      customerProfile: input.customerProfile
        ? await ShoppingMallCustomerProfileAtSummaryTransformer.transform(
            input.customerProfile,
          )
        : null,
    } satisfies IShoppingMallMember.ISummary;
  }
}
