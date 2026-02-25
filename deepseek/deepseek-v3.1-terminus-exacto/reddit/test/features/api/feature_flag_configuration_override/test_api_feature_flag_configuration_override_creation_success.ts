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

export async function test_api_feature_flag_configuration_override_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Generate parent resource IDs (assume they exist)
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test boolean 'enabled' configuration override
  const enabledBody = {
    config_key: "enabled",
    config_value: "true",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate;
  const enabledOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: enabledBody,
      },
    );
  typia.assert(enabledOverride);
  // 4. Validate required fields for boolean override
  TestValidator.equals(
    "config_key matches enabled",
    enabledOverride.config_key,
    "enabled",
  );
  TestValidator.equals(
    "config_value matches true",
    enabledOverride.config_value,
    "true",
  );
  TestValidator.predicate(
    "has UUID id",
    /^[0-9a-f-]{36}$/i.test(enabledOverride.id),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(enabledOverride.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(enabledOverride.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null for active record",
    enabledOverride.deleted_at,
    null,
  );
  // 5. Test numeric 'percentage' configuration override
  const percentageBody = {
    config_key: "percentage",
    config_value: "75",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate;
  const percentageOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: percentageBody,
      },
    );
  typia.assert(percentageOverride);
  TestValidator.equals(
    "config_key matches percentage",
    percentageOverride.config_key,
    "percentage",
  );
  TestValidator.equals(
    "config_value matches 75",
    percentageOverride.config_value,
    "75",
  );
  // 6. Test string 'variant' configuration override
  const variantBody = {
    config_key: "variant",
    config_value: "experimental_variant",
  } satisfies ICommunityPlatformFeatureFlagEnvironmentDetailConfigurationOverride.ICreate;
  const variantOverride =
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: variantBody,
      },
    );
  typia.assert(variantOverride);
  TestValidator.equals(
    "config_key matches variant",
    variantOverride.config_key,
    "variant",
  );
  TestValidator.equals(
    "config_value matches experimental_variant",
    variantOverride.config_value,
    "experimental_variant",
  );
  // 7. Test uniqueness constraint - duplicate key should fail
  await TestValidator.error("duplicate config_key should fail", async () => {
    await api.functional.communityPlatform.admin.feature_flags.environments.details.configuration_overrides.create(
      adminConnection,
      {
        featureFlagId,
        environmentId,
        detailId,
        body: enabledBody,
      },
    );
  });
  // 8. Validate that all overrides have different IDs
  TestValidator.notEquals(
    "enabled and percentage IDs differ",
    enabledOverride.id,
    percentageOverride.id,
  );
  TestValidator.notEquals(
    "enabled and variant IDs differ",
    enabledOverride.id,
    variantOverride.id,
  );
  TestValidator.notEquals(
    "percentage and variant IDs differ",
    percentageOverride.id,
    variantOverride.id,
  );
}
