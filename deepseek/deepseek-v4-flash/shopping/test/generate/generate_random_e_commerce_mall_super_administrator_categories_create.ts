import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_category } from "../prepare/prepare_random_ecommerce_mall_category";

/**
 * Generate a random product category via the API for E2E testing.
 *
 * Prepares random category data using the prepare function, then calls the
 * creation endpoint to persist the category in the database. Administrators
 * use this to create top-level categories or subcategories under a parent.
 *
 * Subcategories are created by providing a parent category ID in the input
 * body. The system enforces a strict two-level hierarchy where only
 * top-level categories can have children.
 *
 * @param connection API connection configuration including authentication
 * @param props Optional partial input to override generated category data
 * @returns The newly created category entity with server-generated metadata
 */
export async function generate_random_e_commerce_mall_super_administrator_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCategory.ICreate> | undefined;
  },
): Promise<IECommerceMallCategory> {
  const prepared: IECommerceMallCategory.ICreate = prepare_random_ecommerce_mall_category(
    props.body,
  );
  const result: IECommerceMallCategory = await api.functional.eCommerceMall.superAdministrator.categories.create(
    connection,
    {
      body: prepared,
    },
  );
  return result;
}