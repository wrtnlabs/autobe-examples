import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProduct.ICreate with randomized values
 * suitable for test scenarios. All four required fields are populated with
 * realistic defaults that can be selectively overridden via DeepPartial input.
 *
 * The product name uses a short paragraph to simulate a descriptive title,
 * while the description generates multi-paragraph content representative of
 * real product listings. The category ID is a valid UUID and base_price is a
 * positive integer, ensuring the payload passes validation without modification.
 */
export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate>,
): IShoppingMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 15,
      }),
    shopping_mall_category_id:
      input?.shopping_mall_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    base_price:
      input?.base_price ??
      typia.random<number & tags.Type<"uint32"> & tags.ExclusiveMinimum<0>>(),
  };
}
