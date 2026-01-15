import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerOnboardingCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingCompletion";
import { IShoppingMallSellerOnboardingSteps } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingSteps";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerOnboardingCompletionTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_onboarding_completionGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        seller: {
          select: {
            id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
        status: true,
        completed_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_onboarding_completionFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerOnboardingCompletion> {
    const statusData = JSON.parse(input.status);
    return {
      seller_id: input.seller.id,
      completed: statusData.completed === true,
      rejection_reason: statusData.rejectionReason ?? undefined,
      steps: statusData.steps,
      created_at: input.created_at.toISOString(),
    };
  }
}
