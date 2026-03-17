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

/**
 * E2E test for creating a new system configuration setting.
 *
 * This test validates:
 * 1. Successful creation with valid key and value
 * 2. Response contains all required fields (id, key, value, description?, created_at, updated_at, deleted_at)
 * 3. Timestamps are populated by server
 * 4. deleted_at is NULL for active records
 * 5. Key and value are preserved in response
 */
export async function test_api_system_setting_creation(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique configuration key and non-empty value
  const uniqueKey = `test_setting_${RandomGenerator.alphaNumeric(10)}`;
  const value = RandomGenerator.alphaNumeric(20);
  const description = RandomGenerator.paragraph({ sentences: 1 });
  const body: IRedditCommunitySystemSetting.ICreate = {
    key: uniqueKey,
    value,
    description,
  };
  // Create system setting using utility function
  const result = await generate_random_reddit_community_system_settings_create(
    connection,
    {
      body,
    },
  );
  // Validate response structure with typia
  typia.assert(result);
  // Validate key matches input
  TestValidator.equals("key matches input", result.key, uniqueKey);
  // Validate value matches input
  TestValidator.equals("value matches input", result.value, value);
  // Validate description matches input
  TestValidator.equals(
    "description matches input",
    result.description,
    description,
  );
  // Validate unique ID exists
  TestValidator.predicate(
    "has unique UUID id",
    typeof result.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        result.id,
      ),
  );
  // Validate created_at is valid date-time
  TestValidator.predicate("created_at is valid timestamp", () => {
    const date = new Date(result.created_at);
    return !isNaN(date.getTime());
  });
  // Validate updated_at is valid date-time
  TestValidator.predicate("updated_at is valid timestamp", () => {
    const date = new Date(result.updated_at);
    return !isNaN(date.getTime());
  });
  // Validate deleted_at is NULL for active record
  TestValidator.equals(
    "deleted_at is NULL for active record",
    result.deleted_at,
    null,
  );
}
