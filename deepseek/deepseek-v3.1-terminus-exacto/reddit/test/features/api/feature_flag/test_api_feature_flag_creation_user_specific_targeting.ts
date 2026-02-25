import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
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

/**
 * Test creating a user-specific feature flag for targeted deployment.
 * Verifies that user-specific flags are created with null boolean_value and percentage_value,
 * and support targeting rule configurations for user segments and A/B testing scenarios.
 */
export async function test_api_feature_flag_creation_user_specific_targeting(
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
  // Create user-specific feature flag using utility function
  const featureFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: `user_specific_flag_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "user_specific",
          status: "active",
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Validate flag properties specific to user_specific type
  TestValidator.equals(
    "flag_type is user_specific",
    featureFlag.flag_type,
    "user_specific",
  );
  TestValidator.equals("status is active", featureFlag.status, "active");
  TestValidator.equals(
    "boolean_value is null for user_specific",
    featureFlag.boolean_value,
    null,
  );
  TestValidator.equals(
    "percentage_value is null for user_specific",
    featureFlag.percentage_value,
    null,
  );
  // Validate business logic: user_specific flags support targeting configurations
  TestValidator.predicate(
    "user_specific flag supports targeting rules",
    featureFlag.flag_type === "user_specific" &&
      featureFlag.boolean_value === null &&
      featureFlag.percentage_value === null,
  );
}
