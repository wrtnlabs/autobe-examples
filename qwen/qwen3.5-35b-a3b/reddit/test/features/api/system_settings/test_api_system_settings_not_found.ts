import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup connections (no auth required for system settings)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Test with random UUID that doesn't exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent system setting",
    404,
    async () => {
      await api.functional.redditCommunity.system_settings.at(guestConnection, {
        systemSettingId: nonExistentId,
      });
    },
  );
  // 3. Test with another random UUID to ensure consistent behavior
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for different non-existent setting",
    404,
    async () => {
      await api.functional.redditCommunity.system_settings.at(guestConnection, {
        systemSettingId: anotherNonExistentId,
      });
    },
  );
}
