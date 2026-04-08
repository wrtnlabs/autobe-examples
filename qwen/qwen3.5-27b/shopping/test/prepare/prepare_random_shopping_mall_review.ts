import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall review creation data for E2E testing.
 *
 * Generates a complete IShoppingMallReview.ICreate with randomized values.
 * Reviews can only be written for products that have been purchased and delivered.
 * Each customer can write one review per order item, ensuring authentic feedback
 * from verified purchases. The review includes a required star rating from 1 to 5
 * and optional detailed text content explaining the rating.
 */
export function prepare_random_shopping_mall_review(
  input?: DeepPartial<IShoppingMallReview.ICreate> | undefined,
): IShoppingMallReview.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
