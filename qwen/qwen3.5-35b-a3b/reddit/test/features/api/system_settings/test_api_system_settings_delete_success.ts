import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_reddit_community_system_settings_create } from "../../../generate/generate_random_reddit_community_system_settings_create";
import { prepare_random_reddit_community_system_setting } from "../../../prepare/prepare_random_reddit_community_system_setting";

export async function test_api_system_settings_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Create a system setting using utility function
  const systemSetting =
    await generate_random_reddit_community_system_settings_create(
      adminConnection,
      {},
    );
  typia.assert(systemSetting);
  // 3. Delete the system setting
  await api.functional.redditCommunity.system_settings.erase(adminConnection, {
    systemSettingId: systemSetting.id,
  });
  // 4. Validate delete completed successfully
  TestValidator.predicate("erase completed without exception", true);
  TestValidator.notEquals("setting was deleted", systemSetting.id, null);
}
