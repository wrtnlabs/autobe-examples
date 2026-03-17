import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup test connection
  const testConnection: api.IConnection = { host: connection.host };
  // 2. Generate random UUID for system setting
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve system setting
  const setting = await api.functional.redditCommunity.system_settings.at(
    testConnection,
    { systemSettingId },
  );
  // 4. Validate response structure
  typia.assert(setting);
  // 5. Validate field values
  TestValidator.equals("id matches request", systemSettingId, setting.id);
  TestValidator.notEquals("key is not empty", setting.key, "");
  TestValidator.notEquals("value is not empty", setting.value, "");
  // 6. Validate description can be null or string (optional field)
  typia.assertGuard(setting);
  TestValidator.predicate(
    "description is string or null",
    typeof setting.description === "string" || setting.description === null,
  );
  // 7. Validate deleted_at is null for active record
  TestValidator.equals(
    "deleted_at is null for active record",
    setting.deleted_at,
    null,
  );
}
