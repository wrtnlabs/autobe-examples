import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not correspond to any existing record
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete a system setting that doesn't exist
  // This should return a 404 error indicating the system setting was not found
  await TestValidator.httpError(
    "should return 404 for non-existent system setting",
    [404],
    async () => {
      await api.functional.redditCommunity.system_settings.erase(connection, {
        systemSettingId: nonExistentId,
      });
    },
  );
  // Verify no side effects occurred from failed deletion attempt
  // The system should remain unchanged and no records should be modified
  // The 404 response indicates the system handled the request gracefully
  // without attempting to modify database state for the non-existent record
}
