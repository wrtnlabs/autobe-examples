import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallProductReviewTransformer } from "./ShoppingMallProductReviewTransformer";

export namespace ShoppingMallSaleReviewVoteTransformer {
  export type Payload = Prisma.shopping_mall_sale_review_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        shopping_mall_product_review_id: true,
        voter_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        review: ShoppingMallProductReviewTransformer.select(),
        voter: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_sale_review_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSaleReviewVote> {
    return {
      id: input.id,
      shoppingMallProductReviewId: input.shopping_mall_product_review_id,
      voterId: input.voter_id,
      actorType: typia.assert<"customer" | "seller">(input.actor_type),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      review: await ShoppingMallProductReviewTransformer.transform(
        input.review,
      ),
      voter: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.voter,
      ),
    };
  }
}
