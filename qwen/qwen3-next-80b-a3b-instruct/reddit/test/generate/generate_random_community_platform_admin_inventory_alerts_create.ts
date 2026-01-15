import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAlerts";
import { prepare_random_community_platform_inventory_alerts } from "../prepare/prepare_random_community_platform_inventory_alerts";
export async function generate_random_community_platform_admin_inventory_alerts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryAlerts.ICreate> | undefined;
  },
): Promise<ICommunityPlatformInventoryAlerts> {
  const prepared: ICommunityPlatformInventoryAlerts.ICreate =
    prepare_random_community_platform_inventory_alerts(props.body);
  return await api.functional.communityPlatform.admin.inventory_alerts.create(
    connection,
    {
      body: prepared,
    },
  );
}
