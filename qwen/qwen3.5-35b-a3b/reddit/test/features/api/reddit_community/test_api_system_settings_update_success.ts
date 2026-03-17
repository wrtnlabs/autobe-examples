import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare random update data
  const newValue = typia.random<string & tags.Format<"uuid">>();
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  // 2. Update the system setting with a valid UUID
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  const updatedSetting =
    await api.functional.redditCommunity.system_settings.update(connection, {
      systemSettingId,
      body: {
        value: newValue,
        description: newDescription,
      },
    });
  typia.assert(updatedSetting);
  // 3. Validate the update response
  TestValidator.equals("updated value", updatedSetting.value, newValue);
  TestValidator.equals(
    "updated description",
    updatedSetting.description,
    newDescription,
  );
  TestValidator.equals(
    "id matches request",
    updatedSetting.id,
    systemSettingId,
  );
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedSetting.updated_at,
    updatedSetting.created_at,
  );
  TestValidator.equals("deleted_at is null", updatedSetting.deleted_at, null);
  TestValidator.predicate(
    "has valid timestamps",
    updatedSetting.created_at !== undefined &&
      updatedSetting.updated_at !== undefined,
  );
}
