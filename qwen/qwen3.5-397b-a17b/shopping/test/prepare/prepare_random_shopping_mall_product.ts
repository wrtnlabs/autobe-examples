import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProduct.ICreate with randomized values for
 * product name, description, category assignment, and base price. All fields
 * support input override through DeepPartial for test customization.
 *
 * The name field generates short descriptive text suitable for product titles.
 * The description field generates multi-paragraph content for detailed product
 * information. The category ID is a valid UUID format. The base price is a
 * positive number representing the standard price before variant adjustments.
 */
export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate>,
): IShoppingMallProduct.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    shopping_mall_category_id:
      input?.shopping_mall_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ??
      typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<1000> &
          tags.Maximum<9999999>
      >(),
  };
}
