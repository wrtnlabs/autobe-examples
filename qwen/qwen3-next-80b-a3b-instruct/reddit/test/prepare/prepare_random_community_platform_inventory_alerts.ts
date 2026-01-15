import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAlerts";
export function prepare_random_community_platform_inventory_alerts(
  input?: DeepPartial<ICommunityPlatformInventoryAlerts.ICreate> | undefined,
): ICommunityPlatformInventoryAlerts.ICreate {
  return {};
}
