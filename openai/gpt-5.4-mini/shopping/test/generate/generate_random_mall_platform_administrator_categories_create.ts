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
 * Prepares category creation data using the matching prepare function, then
 * calls the administrator category creation endpoint to persist the resource.
 * This is intended for end-to-end test setups that need a real category entity
 * created through the API.
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
