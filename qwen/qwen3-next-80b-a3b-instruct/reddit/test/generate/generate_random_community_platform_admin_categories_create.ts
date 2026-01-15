import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import { prepare_random_community_platform_product_category } from "../prepare/prepare_random_community_platform_product_category";
export async function generate_random_community_platform_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductCategory.ICreate> | undefined;
  },
): Promise<ICommunityPlatformProductCategory> {
  const prepared: ICommunityPlatformProductCategory.ICreate =
    prepare_random_community_platform_product_category(props.body);
  return await api.functional.communityPlatform.admin.categories.create(
    connection,
    {
      body: prepared,
    },
  );
}
