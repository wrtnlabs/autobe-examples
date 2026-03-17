import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_update_single_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Generate a system setting with description
  // Note: System settings cannot be created via API, so we generate a UUID and assume it exists
  const originalSetting: IRedditCommunitySystemSetting =
    typia.random<IRedditCommunitySystemSetting>();
  // Store original values for comparison
  const originalValue: string = originalSetting.value;
  const originalDescription: string | null | undefined =
    originalSetting.description;
  const originalCreatedAt: string = originalSetting.created_at;
  const originalUpdatedAt: string = originalSetting.updated_at;
  // 2. Update: Change only the value field (leave description unchanged)
  const newValue: string = RandomGenerator.alphabets(16);
  const updateBody: IRedditCommunitySystemSetting.IUpdate = {
    value: newValue,
  } satisfies IRedditCommunitySystemSetting.IUpdate;
  const updatedSetting: IRedditCommunitySystemSetting =
    await api.functional.redditCommunity.system_settings.update(connection, {
      systemSettingId: originalSetting.id,
      body: updateBody,
    });
  // Validate response type
  typia.assert(updatedSetting);
  // 3. Verify: Description remains unchanged
  TestValidator.equals(
    "description unchanged after partial update",
    updatedSetting.description,
    originalDescription,
  );
  // 4. Verify: Value is updated to new value
  TestValidator.equals(
    "value updated to new value",
    updatedSetting.value,
    newValue,
  );
  // 5. Verify: created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged after update",
    updatedSetting.created_at,
    originalCreatedAt,
  );
  // 6. Verify: updated_at is newer than original
  TestValidator.predicate(
    "updated_at is newer than original",
    () => new Date(updatedSetting.updated_at) > new Date(originalUpdatedAt),
  );
  // 7. Verify: All other fields are preserved correctly
  TestValidator.equals(
    "key unchanged after update",
    updatedSetting.key,
    originalSetting.key,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedSetting.deleted_at,
    originalSetting.deleted_at,
  );
}
