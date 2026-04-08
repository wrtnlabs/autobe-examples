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
 * The category is created with a randomized name, description, and optional parentId for
 * hierarchical organization. Only administrators can access this endpoint.
 *
 * This function supports test customization through the DeepPartial input parameter,
 * allowing tests to override specific properties while using generated values for the rest.
 *
 * @param connection - The API connection for making the request
 * @param props - Optional parameters including body overrides
 * @returns The created category entity with all fields including generated id and timestamps
 */
export async function generate_random_shopping_mall_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCategory.ICreate>;
  },
): Promise<IShoppingMallCategory> {
  const prepared: IShoppingMallCategory.ICreate =
    prepare_random_shopping_mall_category(props.body);
  const result: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: prepared,
    });
  return result;
}
