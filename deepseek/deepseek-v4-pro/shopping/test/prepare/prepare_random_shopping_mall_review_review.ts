import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall review creation data for E2E testing.
 *
 * Generates a complete IShoppingMallReviewReview.ICreate with randomized
 * values. All three ID fields reference other entities (product, order,
 * order item) and are generated as valid UUIDs. The rating is a random
 * integer between 1 and 5 inclusive. Content is optional review text,
 * defaulting to a short paragraph.
 *
 * The authenticated customer must have purchased the product and the
 * corresponding order item must be in delivered status for the review
 * to be valid at the API level.
 */
export function prepare_random_shopping_mall_review_review(
  input?: DeepPartial<IShoppingMallReviewReview.ICreate>,
): IShoppingMallReviewReview.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id:
      input?.shopping_mall_order_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
