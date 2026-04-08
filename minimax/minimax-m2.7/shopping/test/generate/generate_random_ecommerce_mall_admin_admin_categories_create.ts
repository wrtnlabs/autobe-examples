import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_category } from "../prepare/prepare_random_ecommerce_mall_category";

/**
 * Generate a random e-commerce mall category via the admin API for E2E testing.
 *
 * Creates a new product category on the platform through the administrator endpoint.
 * Supports both top-level categories (parent_id = null) and subcategories (parent_id = valid UUID).
 * The prepare function generates randomized category data that can be optionally overridden
 * via the props.body parameter.
 *
 * @param connection - API connection with authentication
 * @param props - Optional body overrides for the category creation payload
 * @returns The newly created category with all fields populated
 * @throws Error when unauthorized or when category creation fails
 */
export async function generate_random_ecommerce_mall_admin_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCategory.ICreate>;
  },
): Promise<IEcommerceMallCategory> {
  const prepared: IEcommerceMallCategory.ICreate =
    prepare_random_ecommerce_mall_category(props.body);
  const result: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
