import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_category } from "../prepare/prepare_random_shopping_mall_category";

/**
 * Generate a random shopping mall category via the API for E2E testing.
 *
 * Prepares random category data using the prepare function, then calls the creation endpoint.
 * Categories organize products for customer browsing and filtering. Top-level categories
 * have no parent, while subcategories reference a parent_category_id. The system enforces
 * a one-level nesting structure.
 *
 * This function is for administrator operations and requires appropriate authentication.
 */
export async function generate_random_shopping_mall_administrator_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCategory.ICreate> | undefined;
  },
): Promise<IShoppingMallCategory> {
  const prepared: IShoppingMallCategory.ICreate =
    prepare_random_shopping_mall_category(props.body);
  const result: IShoppingMallCategory =
    await api.functional.shoppingMall.administrator.categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
