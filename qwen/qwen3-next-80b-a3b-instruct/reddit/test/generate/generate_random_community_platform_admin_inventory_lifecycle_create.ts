import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryLifecycle";
import { prepare_random_community_platform_inventory_lifecycle } from "../prepare/prepare_random_community_platform_inventory_lifecycle";
export async function generate_random_community_platform_admin_inventory_lifecycle_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryLifecycle.ICreate>;
  },
): Promise<ICommunityPlatformInventoryLifecycle> {
  const prepared: ICommunityPlatformInventoryLifecycle.ICreate =
    prepare_random_community_platform_inventory_lifecycle(props.body);
  const result: ICommunityPlatformInventoryLifecycle =
    await api.functional.communityPlatform.admin.inventory_lifecycle.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
