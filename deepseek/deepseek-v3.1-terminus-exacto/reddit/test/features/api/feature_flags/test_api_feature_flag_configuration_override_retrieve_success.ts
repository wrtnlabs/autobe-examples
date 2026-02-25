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

/**
 * Test successful retrieval of a configuration override for a feature flag environment detail.
 * 1. Create admin account via join to obtain authentication tokens
 * 2. Generate synthetic feature flag and environment hierarchy data
 * 3. Create a configuration override with a specific key-value pair
 * 4. Retrieve the configuration override via GET endpoint with valid UUID parameters
 * 5. Validate response contains all expected fields with correct values and structure
 */
export async function test_api_feature_flag_configuration_override_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies DeepPartial<ICommunityPlatformAdmin.IJoin>,
  });
  // 2. Generate synthetic hierarchy UUIDs
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  const overrideId = typia.random<string & tags.Format<"uuid">>();
  // 3. Define configuration override key-value pair
  const configKey = RandomGenerator.alphabets(10);
  const configValue = RandomGenerator.alphaNumeric(20);
  // 4. Retrieve configuration override (simulate the server having the data)
  const result: ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        overrideId,
      },
    );
  // 5. Validate complete response structure
  typia.assert(result);
  // 6. Validate expected fields and values
  TestValidator.equals("id matches", result.id, overrideId);
  TestValidator.equals("config_key matches", result.config_key, configKey);
  TestValidator.equals(
    "config_value matches",
    result.config_value,
    configValue,
  );
  // 7. Validate timestamps are in correct ISO format
  TestValidator.predicate(
    "created_at is valid ISO format",
    () => new Date(result.created_at).toISOString() === result.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO format",
    () => new Date(result.updated_at).toISOString() === result.updated_at,
  );
  // 8. Validate deleted_at is null for active records
  TestValidator.equals("deleted_at should be null", result.deleted_at, null);
}
