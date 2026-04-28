import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_category } from "../prepare/prepare_random_ecommerce_platform_category";

/**
 * Generate a random ecommerce platform category via the API for E2E testing.
 *
 * Prepares random category data using the prepare function, then calls the
 * creation endpoint. Generates root categories by default without a parent.
 * Subcategories can be created by providing a parentEcommercePlatformCategoryId
 * in the body parameter, supporting the two-level hierarchy structure.
 */
export async function generate_random_ecommerce_platform_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformCategory.ICreate>;
  },
): Promise<IEcommercePlatformCategory> {
  const prepared: IEcommercePlatformCategory.ICreate =
    prepare_random_ecommerce_platform_category(props.body);
  const result: IEcommercePlatformCategory =
    await api.functional.ecommercePlatform.admin.categories.create(connection, {
      body: prepared,
    });
  return result;
}
