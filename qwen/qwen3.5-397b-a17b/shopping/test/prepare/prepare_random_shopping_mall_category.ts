import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall category creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCategory.ICreate with randomized values for
 * testing category creation endpoints. The name is always generated as a
 * human-readable string, while description and parentId are optional fields
 * that can be null or contain generated values.
 *
 * This function supports test customization through the DeepPartial input
 * parameter, allowing tests to override specific properties while using
 * generated values for the rest.
 */
export function prepare_random_shopping_mall_category(
  input?: DeepPartial<IShoppingMallCategory.ICreate>,
): IShoppingMallCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentId: input?.parentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
