import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_feature_flags_create } from "../../../generate/generate_random_community_platform_admin_feature_flags_create";
import { prepare_random_community_platform_feature_flag } from "../../../prepare/prepare_random_community_platform_feature_flag";

export async function test_api_feature_flag_environment_detail_not_found(
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
  // Create a feature flag to have valid parent resource
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean",
          status: "active",
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Test case 1: Valid featureFlagId but invalid environmentId (non-existent UUID)
  await TestValidator.error(
    "environment detail not found with invalid environmentId",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 2: Valid environmentId but invalid featureFlagId (non-existent UUID)
  await TestValidator.error(
    "environment detail not found with invalid featureFlagId",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.at(
        adminConnection,
        {
          featureFlagId: typia.random<string & tags.Format<"uuid">>(),
          environmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 3: Both parameters valid UUIDs but non-existent relationship
  // Create a second feature flag to test non-matching relationship
  const secondFeatureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10) + "_second",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "inactive",
          percentage_value: 50,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(secondFeatureFlag);
  await TestValidator.error(
    "environment detail not found with non-matching parent-child relationship",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.at(
        adminConnection,
        {
          featureFlagId: featureFlag.id,
          environmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
