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

export async function test_api_system_setting_feature_flag(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate feature flag configuration with naming convention
  // Feature flag key uses standard naming: feature_<component>_<function>_enabled
  const featureFlagKey = "feature_new_comment_system_enabled";
  const featureFlagValue = "true"; // String representation of boolean
  const description = "Enables the new comment system for all users";
  // Create system setting with feature flag configuration
  const output: IRedditCommunitySystemSetting =
    await generate_random_reddit_community_system_settings_create(
      adminConnection,
      {
        body: {
          key: featureFlagKey,
          value: featureFlagValue,
          description: description,
        } satisfies IRedditCommunitySystemSetting.ICreate,
      },
    );
  typia.assert(output);
  // Validate feature flag configuration
  TestValidator.equals("feature flag key matches", output.key, featureFlagKey);
  TestValidator.equals(
    "feature flag value is string boolean",
    output.value,
    featureFlagValue,
  );
  TestValidator.equals("description matches", output.description, description);
  // Validate UUID format for id
  typia.assert<string & tags.Format<"uuid">>(output.id);
  // Validate timestamp formats
  typia.assert<string & tags.Format<"date-time">>(output.created_at);
  typia.assert<string & tags.Format<"date-time">>(output.updated_at);
  typia.assert<(string & tags.Format<"date-time">) | null>(output.deleted_at);
  // Validate soft delete is null for active record
  TestValidator.equals("soft delete is null", output.deleted_at, null);
}