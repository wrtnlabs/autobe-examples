import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_category } from "../prepare/prepare_random_mall_platform_category";

export async function generate_random_mall_platform_administrator_categories_subcategories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformCategory.ICreate> | undefined;
    params: {
      parentCategoryId: string;
    };
  },
): Promise<IMallPlatformCategory> {
  const prepared: IMallPlatformCategory.ICreate =
    prepare_random_mall_platform_category(props.body);
  return await api.functional.mallPlatform.administrator.categories.subcategories.create(
    connection,
    {
      body: prepared,
      parentCategoryId: props.params.parentCategoryId,
    },
  );
}
