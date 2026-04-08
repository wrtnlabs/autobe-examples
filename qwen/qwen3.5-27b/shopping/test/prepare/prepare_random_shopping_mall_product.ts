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
 * product name, description, base price, and optional category assignment.
 * The product name is human-readable text, description contains multiple
 * paragraphs, base price is a realistic currency amount, and category_id is
 * a valid UUID when provided.
 */
export function prepare_random_shopping_mall_product(
  input?: DeepPartial<IShoppingMallProduct.ICreate> | undefined,
): IShoppingMallProduct.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    base_price:
      input?.base_price ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
