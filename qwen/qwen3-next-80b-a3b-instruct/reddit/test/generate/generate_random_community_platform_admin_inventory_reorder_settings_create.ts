import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryExternalFactorImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryExternalFactorImpact";
import type { ICommunityPlatformInventoryReorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSetting";
import { prepare_random_community_platform_inventory_reorder_setting } from "../prepare/prepare_random_community_platform_inventory_reorder_setting";
export async function generate_random_community_platform_admin_inventory_reorder_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryReorderSetting.ICreate>;
  },
): Promise<ICommunityPlatformInventoryReorderSetting> {
  const prepared: ICommunityPlatformInventoryReorderSetting.ICreate =
    prepare_random_community_platform_inventory_reorder_setting(props.body);
  const result: ICommunityPlatformInventoryReorderSetting =
    await api.functional.communityPlatform.admin.inventory_reorder_settings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
