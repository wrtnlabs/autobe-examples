import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "./ShoppingMallSuperAdminAtSummaryTransformer";

export namespace ShoppingMallAdminPromotionRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_promotion_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        rejection_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: ShoppingMallSuperAdminAtSummaryTransformer.select(),
        memberApplicant: {
          select: {
            member: ShoppingMallMemberAtSummaryTransformer.select(),
          },
        },
        sellerApplicant: {
          select: {
            seller: ShoppingMallSellerAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.shopping_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionRequest.ISummary> {
    return {
      id: input.id,
      actorType: input.actor_type,
      status: input.status,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
      applicant:
        input.actor_type === "member"
          ? await ShoppingMallMemberAtSummaryTransformer.transform(
              input.memberApplicant!.member,
            )
          : await ShoppingMallSellerAtSummaryTransformer.transform(
              input.sellerApplicant!.seller,
            ),
      reviewer: input.reviewer
        ? await ShoppingMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
    } satisfies IShoppingMallAdminPromotionRequest.ISummary;
  }
}
