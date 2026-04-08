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
 * Generate a random e-commerce mall category via the API for E2E testing.
 *
 * Creates a new product category on the platform for testing purposes.
 * Supports both top-level categories and subcategories when parent_id is provided.
 * Requires administrator authentication with ADMIN or SUPER_ADMIN role.
 *
 * @param connection - API connection instance for making HTTP requests
 * @param props - Optional category creation properties
 * @param props.body - Optional DeepPartial override for category creation data
 * @returns The newly created category with all fields including system-generated timestamps and ID
 */
export async function generate_random_ecommerce_mall_super_admin_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCategory.ICreate>;
  },
): Promise<IEcommerceMallCategory> {
  const prepared: IEcommerceMallCategory.ICreate =
    prepare_random_ecommerce_mall_category(props.body);
  const result: IEcommerceMallCategory =
    await api.functional.ecommerceMall.superAdmin.admin.categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
