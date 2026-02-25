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
 * Test gradual rollout modification scenario where an existing percentage-based feature flag is optimized for deployment strategy.
 * This scenario validates the ability to adjust rollout percentage values and switch rollout strategies without compromising feature flag integrity.
 */
export async function test_api_admin_feature_flag_update_gradual_rollout_modification(
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
  typia.assert(admin);
  // 2. Create a percentage-type feature flag with initial 50% rollout value
  const initialFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: "Initial gradual rollout feature flag",
          flag_type: "percentage",
          status: "active",
          percentage_value: 50 satisfies number as number,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(initialFlag);
  // Validate initial flag state
  TestValidator.equals(
    "initial flag type is percentage",
    initialFlag.flag_type,
    "percentage",
  );
  TestValidator.equals(
    "initial percentage value is 50",
    initialFlag.percentage_value,
    50,
  );
  TestValidator.equals(
    "initial boolean_value is null for percentage flag",
    initialFlag.boolean_value,
    null,
  );
  // 3. Update the flag to increase rollout percentage to 75% while maintaining percentage type
  // 4. Additionally update the description to reflect the rollout strategy optimization
  const updatedFlag =
    await api.functional.communityPlatform.admin.feature_flags.update(
      adminConnection,
      {
        featureFlagId: initialFlag.id,
        body: {
          percentage_value: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<75> & tags.Maximum<75>
          >() satisfies number as number,
          description:
            "Optimized gradual rollout strategy with increased percentage",
        } satisfies ICommunityPlatformFeatureFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // 5. Verify that the boolean_value remains null throughout as the flag type remains percentage
  TestValidator.equals(
    "boolean_value remains null for percentage flag",
    updatedFlag.boolean_value,
    null,
  );
  // 6. Validate percentage value was updated correctly
  TestValidator.equals(
    "percentage value increased from 50 to 75",
    updatedFlag.percentage_value,
    75,
  );
  // 7. Validate description was updated
  TestValidator.equals(
    "description updated",
    updatedFlag.description,
    "Optimized gradual rollout strategy with increased percentage",
  );
  // 8. Validate flag type remains unchanged
  TestValidator.equals(
    "flag type remains percentage",
    updatedFlag.flag_type,
    "percentage",
  );
  // 9. Validate status remains active
  TestValidator.equals("status remains active", updatedFlag.status, "active");
  // 10. Validate flag ID remains the same
  TestValidator.equals(
    "flag ID remains unchanged",
    updatedFlag.id,
    initialFlag.id,
  );
}
