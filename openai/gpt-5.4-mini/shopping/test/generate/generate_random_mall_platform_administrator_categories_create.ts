import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_category } from "../prepare/prepare_random_mall_platform_category";

/**
 * Generate a random mall platform category via the API for E2E testing.
 *
 * Prepares random category creation data using the prepare function, then calls the administrator category creation endpoint.
 *
 * This is intended for creating top-level categories or direct subcategories during end-to-end test setup.
 *
 * @param connection The API connection to use when creating the category.
 * @param props Optional body overrides for the category creation payload.
 * @returns The created mall platform category.
 */
export async function generate_random_mall_platform_administrator_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCategory.ICreate> | undefined;
  },
): Promise<IMallPlatformCategory> {
  const prepared: IMallPlatformCategory.ICreate =
    prepare_random_mall_platform_category(props.body);
  return await api.functional.mallPlatform.administrator.categories.create(
    connection,
    {
      body: prepared,
    },
  );
}
