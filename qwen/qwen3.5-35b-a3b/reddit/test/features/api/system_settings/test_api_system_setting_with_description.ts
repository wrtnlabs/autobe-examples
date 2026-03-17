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

export async function test_api_system_setting_with_description(
  connection: api.IConnection,
): Promise<void> {
  const descriptionText = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const settingKey = RandomGenerator.alphaNumeric(10);
  const settingValue = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 5,
  });
  const systemSetting =
    await generate_random_reddit_community_system_settings_create(connection, {
      body: {
        key: settingKey,
        value: settingValue,
        description: descriptionText,
      } satisfies IRedditCommunitySystemSetting.ICreate,
    });
  typia.assert(systemSetting);
  TestValidator.equals("key stored correctly", systemSetting.key, settingKey);
  TestValidator.equals(
    "value stored correctly",
    systemSetting.value,
    settingValue,
  );
  TestValidator.equals(
    "description stored correctly",
    systemSetting.description,
    descriptionText,
  );
  TestValidator.predicate(
    "description is not null",
    systemSetting.description !== null,
  );
  TestValidator.equals("deleted_at is null", systemSetting.deleted_at, null);
  typia.assert(systemSetting.created_at);
  typia.assert(systemSetting.updated_at);
  typia.assert(systemSetting.id);
}
