import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryBatches";
import { prepare_random_community_platform_inventory_batches } from "../prepare/prepare_random_community_platform_inventory_batches";
export async function generate_random_community_platform_admin_inventory_batches_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryBatches.ICreate>;
  },
): Promise<ICommunityPlatformInventoryBatches> {
  const prepared: ICommunityPlatformInventoryBatches.ICreate =
    prepare_random_community_platform_inventory_batches(props.body);
  const result: ICommunityPlatformInventoryBatches =
    await api.functional.communityPlatform.admin.inventory_batches.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
