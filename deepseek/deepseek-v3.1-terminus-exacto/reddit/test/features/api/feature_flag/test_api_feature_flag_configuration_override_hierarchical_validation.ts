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

export async function test_api_feature_flag_configuration_override_hierarchical_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate random UUIDs to use as parameters
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  const overrideId = typia.random<string & tags.Format<"uuid">>();
  // Generate mismatched UUIDs for testing
  const mismatchedEnvironmentId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedDetailId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedFeatureFlagId = typia.random<string & tags.Format<"uuid">>();
  // Since we cannot create actual hierarchical resources (missing creation APIs),
  // we can only test that the endpoint validates UUID formats and returns errors.
  // The hierarchical validation business logic cannot be fully tested without
  // the ability to create the resources first.
  // Test 1: Valid UUID parameters but non-existent resources - should error
  await TestValidator.error(
    "GET with valid UUIDs but non-existent resources should fail",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
        adminConnection,
        {
          featureFlagId,
          environmentId,
          detailId,
          overrideId,
        },
      );
    },
  );
  // Test 2: Mismatched environment ID - should also error
  // Note: Without actual resources, we can't distinguish hierarchical validation
  // from simple "not found", but we still test the endpoint works.
  await TestValidator.error(
    "GET with mismatched environmentId should fail",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
        adminConnection,
        {
          featureFlagId,
          environmentId: mismatchedEnvironmentId,
          detailId,
          overrideId,
        },
      );
    },
  );
  // Test 3: Mismatched detail ID
  await TestValidator.error(
    "GET with mismatched detailId should fail",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
        adminConnection,
        {
          featureFlagId,
          environmentId,
          detailId: mismatchedDetailId,
          overrideId,
        },
      );
    },
  );
  // Test 4: Mismatched feature flag ID
  await TestValidator.error(
    "GET with mismatched featureFlagId should fail",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
        adminConnection,
        {
          featureFlagId: mismatchedFeatureFlagId,
          environmentId,
          detailId,
          overrideId,
        },
      );
    },
  );
}
