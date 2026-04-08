import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_category } from "../prepare/prepare_random_ecommerce_category";

/**
 * Generate a random e-commerce category via the API for E2E testing.
 *
 * Prepares random category data using the prepare function, then calls the creation endpoint. This function supports creating both root categories (with parent_id = null) and subcategories (with parent_id = UUID) for testing hierarchical category structures.
 *
 * The generated category includes a randomized name, optional description, and optional parent category reference. Category names must be unique within the same parent level, and if a parent_id is provided, it must reference an existing active category.
 *
 * @param connection The API connection object with authentication
 * @param props Properties containing optional partial category data and parameters
 * @param props.body Optional partial category creation data to override random values
 * @returns The created category entity with system-generated id and timestamps
 */
export async function generate_random_ecommerce_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCategory.ICreate> | undefined;
  },
): Promise<IEcommerceCategory> {
  const prepared: IEcommerceCategory.ICreate =
    prepare_random_ecommerce_category(props.body);
  const result: IEcommerceCategory =
    await api.functional.ecommerce.admin.categories.create(connection, {
      body: prepared,
    });
  return result;
}
