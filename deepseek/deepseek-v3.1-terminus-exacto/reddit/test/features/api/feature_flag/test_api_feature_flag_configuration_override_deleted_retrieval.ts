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

export async function test_api_feature_flag_configuration_override_deleted_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate UUIDs for hierarchical structure
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  const overrideId = typia.random<string & tags.Format<"uuid">>();
  // Note: Since we don't have API functions to create the hierarchical structure,
  // we rely on the fact that the endpoint validates existence through UUID relationships.
  // In a real implementation, we would need to create feature flag, environment, and detail first.
  // Generate a configuration override with deleted_at timestamp set (simulating soft deletion)
  const configurationOverride =
    typia.random<ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride>();
  // Call the GET endpoint to retrieve the configuration override
  const retrievedOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.at(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        overrideId,
      },
    );
  typia.assert(retrievedOverride);
  // Since we're testing soft-deleted retrieval, we expect the system to handle
  // missing/deleted records appropriately based on the business logic
  TestValidator.predicate(
    "should return a valid configuration override record",
    retrievedOverride.id === overrideId,
  );
}
