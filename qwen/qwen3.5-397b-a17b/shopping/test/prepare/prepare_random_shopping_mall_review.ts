import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall review creation data for E2E testing.
 *
 * Generates a complete IShoppingMallReview.ICreate with randomized values for
 * product reviews. All UUID references are auto-generated, while rating and
 * content can be customized through the input parameter.
 *
 * The function creates realistic review data with a star rating between 1-5
 * and optional review content text. The three reference IDs (product, order,
 * and order item) are generated as UUIDs to simulate valid database references.
 *
 * @param input - Optional partial input for test-time customization
 * @returns Complete IShoppingMallReview.ICreate object for API testing
 */
export function prepare_random_shopping_mall_review(
  input?: DeepPartial<IShoppingMallReview.ICreate>,
): IShoppingMallReview.ICreate {
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
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
