import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewFlagAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_review_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        review: {
          select: {
            id: true,
          },
        },
        customer: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_review_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewFlag.ISummary> {
    return {
      id: input.id,
      review_id: input.review.id,
      flagger_id: input.customer.id,
      reason: typia.assert<
        | "harassment"
        | "spam"
        | "other"
        | "inappropriate_content"
        | "false_information"
      >(input.reason),
      status: "pending", // Explicit enum value from DTO type
      comment: null, // Comment is optional but must be null when not available
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
