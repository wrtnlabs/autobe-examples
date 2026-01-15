import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
import { prepare_random_community_platform_product_stock_level } from "../prepare/prepare_random_community_platform_product_stock_level";
export async function generate_random_community_platform_admin_productstocklevels_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductStockLevel.ICreate> | undefined;
  },
): Promise<ICommunityPlatformProductStockLevel> {
  const prepared: ICommunityPlatformProductStockLevel.ICreate =
    prepare_random_community_platform_product_stock_level(props.body);
  const result: ICommunityPlatformProductStockLevel =
    await api.functional.communityPlatform.admin.productstocklevels.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
