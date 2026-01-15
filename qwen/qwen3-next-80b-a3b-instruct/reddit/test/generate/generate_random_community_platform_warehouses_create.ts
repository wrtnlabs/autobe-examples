import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_warehouses } from "../prepare/prepare_random_community_platform_warehouses";
export async function generate_random_community_platform_warehouses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformWarehouses.ICreate> | undefined;
  },
): Promise<ICommunityPlatformWarehouses> {
  const prepared: ICommunityPlatformWarehouses.ICreate =
    prepare_random_community_platform_warehouses(props.body);
  const result: ICommunityPlatformWarehouses =
    await api.functional.communityPlatform.warehouses.create(connection, {
      body: prepared,
    });
  return result;
}
