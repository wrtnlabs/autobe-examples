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
 * Generate a random e-commerce mall category via the API for E2E testing.
 *
 * Prepares random category data using the prepare function, then calls the
 * creation endpoint to create a new category in the system. The function
 * supports creating both top-level categories (default, parent_id is null)
 * and subcategories by providing a parent category UUID through the optional
 * input body.
 *
 * @param connection The API connection configuration
 * @param props Optional overrides for the category creation payload
 * @returns The newly created category entity from the server
 */
export async function generate_random_e_commerce_mall_administrator_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallCategory.ICreate> | undefined;
  },
): Promise<IECommerceMallCategory> {
  const prepared: IECommerceMallCategory.ICreate =
    prepare_random_ecommerce_mall_category(props.body);
  return await api.functional.eCommerceMall.administrator.categories.create(
    connection,
    {
      body: prepared,
    },
  );
}
