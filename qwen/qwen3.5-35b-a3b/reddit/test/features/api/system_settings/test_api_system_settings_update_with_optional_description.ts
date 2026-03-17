import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_update_with_optional_description(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUID for system setting ID to update
  const systemSettingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare update data with both value (required) and description (optional)
  const newValue: string = typia.random<string>();
  const newDescription: string | null | undefined = typia.random<
    string | null | undefined
  >();
  const body = {
    value: newValue,
    description: newDescription,
  } satisfies IRedditCommunitySystemSetting.IUpdate;
  // Perform the update operation
  const response = await api.functional.redditCommunity.system_settings.update(
    connection,
    { systemSettingId, body },
  );
  typia.assert(response);
  // Validate that the value was updated
  TestValidator.equals(
    "value field updated correctly",
    response.value,
    newValue,
  );
  // Validate that the description field exists and has correct value
  if (newDescription !== undefined) {
    TestValidator.equals(
      "description field updated correctly",
      response.description ?? undefined,
      newDescription,
    );
  } else {
    // When newDescription is undefined, check it exists in response (may be null)
    TestValidator.predicate(
      "description field exists in response",
      response.description !== undefined,
    );
  }
  // Validate that all response fields have correct types and formats
  typia.assert<string & tags.Format<"uuid">>(response.id);
  typia.assert<string>(response.key);
  typia.assert<string>(response.value);
  typia.assert<string | null | undefined>(response.description);
  typia.assert<string & tags.Format<"date-time">>(response.created_at);
  typia.assert<string & tags.Format<"date-time">>(response.updated_at);
  typia.assert<(string & tags.Format<"date-time">) | null>(response.deleted_at);
  // Validate that updated_at is a valid date-time format (was refreshed)
  TestValidator.predicate(
    "updated_at is valid date-time format",
    !isNaN(Date.parse(response.updated_at)),
  );
  // Validate that created_at is a valid date-time format (not modified)
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(Date.parse(response.created_at)),
  );
}
