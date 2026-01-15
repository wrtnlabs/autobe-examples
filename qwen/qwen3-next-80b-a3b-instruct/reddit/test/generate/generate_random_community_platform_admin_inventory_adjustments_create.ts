import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import { prepare_random_community_platform_inventory_adjustments } from "../prepare/prepare_random_community_platform_inventory_adjustments";
export async function generate_random_community_platform_admin_inventory_adjustments_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformInventoryAdjustments.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformInventoryAdjustments> {
  const prepared: ICommunityPlatformInventoryAdjustments.ICreate =
    prepare_random_community_platform_inventory_adjustments(props.body);
  const result: ICommunityPlatformInventoryAdjustments =
    await api.functional.communityPlatform.admin.inventory_adjustments.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
