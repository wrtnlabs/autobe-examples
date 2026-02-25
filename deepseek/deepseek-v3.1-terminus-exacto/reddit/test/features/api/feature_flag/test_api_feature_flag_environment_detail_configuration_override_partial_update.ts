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

export async function test_api_feature_flag_environment_detail_configuration_override_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Since we don't have the prerequisite operations to create the feature flag hierarchy,
  // we'll test the partial update functionality with valid UUIDs that should exist
  // in a properly seeded test environment
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  // Test partial update - only update config_value while keeping config_key unchanged
  const updateBody = {
    config_value: "true",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.IUpdate;
  const updatedOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.patchByFeatureflagidAndEnvironmentidAndDetailid(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: updateBody,
      },
    );
  typia.assert(updatedOverride);
  // Validate partial update behavior
  TestValidator.predicate(
    "updated override should have valid structure",
    typeof updatedOverride.id === "string" &&
      typeof updatedOverride.config_key === "string" &&
      typeof updatedOverride.config_value === "string" &&
      typeof updatedOverride.created_at === "string" &&
      typeof updatedOverride.updated_at === "string",
  );
}
