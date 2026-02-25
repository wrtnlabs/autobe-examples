import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_environments_details_configuration_overrides_create";
import { prepare_random_community_platform_feature_flag_environment_detail_configuration_override } from "../../../prepare/prepare_random_community_platform_feature_flag_environment_detail_configuration_override";

export async function test_api_feature_flag_configuration_duplicate_key_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Test business logic validation preventing duplicate configuration keys within the same detail context.
  // 1. Authenticate as admin
  // 2. Create a configuration override with a specific key
  // 3. Attempt to create another override with the same key
  // 4. Verify that the system correctly rejects the duplicate key creation with appropriate business logic error
  // 1. Admin authentication - create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  // Generate necessary IDs
  const featureFlagId = typia.random<string & typia.tags.Format<"uuid">>();
  const environmentId = typia.random<string & typia.tags.Format<"uuid">>();
  const detailId = typia.random<string & typia.tags.Format<"uuid">>();
  // 2. Create first configuration override with key "enabled"
  const firstOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: {
          config_key: "enabled",
          config_value: "true",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  typia.assert(firstOverride);
  TestValidator.equals(
    "first override has correct key",
    firstOverride.config_key,
    "enabled",
  );
  // 3. Attempt to create duplicate configuration override with same key
  await TestValidator.error("duplicate key should be rejected", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: {
          config_key: "enabled",
          config_value: "false",
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate,
      },
    );
  });
  // 4. Verify that first override still exists and is unchanged
  // No assertion needed for business logic error test
}
