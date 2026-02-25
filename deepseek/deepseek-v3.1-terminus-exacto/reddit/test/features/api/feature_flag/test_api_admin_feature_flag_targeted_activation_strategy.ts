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
 * Test feature flag activation strategy modification scenario focusing on status transitions
 * and targeted user deployment configuration. This scenario validates the ability to modify
 * flag lifecycle states and prepare flags for user-specific targeting deployments.
 */
export async function test_api_admin_feature_flag_targeted_activation_strategy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  await typia.assert(admin);
  // 2. Create an inactive feature flag with boolean type for targeted deployment preparation
  const initialFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "inactive" as const,
          boolean_value: false,
        } satisfies DeepPartial<ICommunityPlatformFeatureFlag.ICreate>,
      },
    );
  await typia.assert(initialFlag);
  // 3. Update the flag to switch from boolean to user_specific type while activating it to active status
  const updatedFlag =
    await api.functional.communityPlatform.admin.feature_flags.update(
      adminConnection,
      {
        featureFlagId: initialFlag.id,
        body: {
          flag_type: "user_specific" as const,
          status: "active" as const,
          boolean_value: null,
          percentage_value: null,
        } satisfies ICommunityPlatformFeatureFlag.IUpdate,
      },
    );
  await typia.assert(updatedFlag);
  // 4. Validate that both boolean_value and percentage_value are properly nulled
  TestValidator.equals(
    "boolean_value should be null",
    updatedFlag.boolean_value,
    null,
  );
  TestValidator.equals(
    "percentage_value should be null",
    updatedFlag.percentage_value,
    null,
  );
  // 5. Verify status transition and type conversion
  TestValidator.equals(
    "flag_type should be user_specific",
    updatedFlag.flag_type,
    "user_specific",
  );
  TestValidator.equals("status should be active", updatedFlag.status, "active");
  TestValidator.notEquals(
    "updated_at should be different",
    initialFlag.updated_at,
    updatedFlag.updated_at,
  );
  // 6. Validate that targeted deployment capabilities are prepared
  TestValidator.predicate(
    "flag should be ready for user-specific targeting",
    updatedFlag.flag_type === "user_specific" &&
      updatedFlag.status === "active",
  );
}
