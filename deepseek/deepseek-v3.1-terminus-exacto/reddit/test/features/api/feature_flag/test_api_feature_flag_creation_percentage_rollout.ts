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

export async function test_api_feature_flag_creation_percentage_rollout(
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
  // Test 1: Create percentage-type feature flag with valid percentage using utility function
  const validPercentageFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          flag_type: "percentage",
          status: "active",
          percentage_value: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
          boolean_value: null,
        } satisfies DeepPartial<ICommunityPlatformFeatureFlag.ICreate>,
      },
    );
  typia.assert(validPercentageFlag);
  // Validate percentage-specific constraints
  TestValidator.equals(
    "flag type should be percentage",
    validPercentageFlag.flag_type,
    "percentage",
  );
  TestValidator.predicate(
    "percentage value should be between 0-100",
    validPercentageFlag.percentage_value !== null &&
      validPercentageFlag.percentage_value >= 0 &&
      validPercentageFlag.percentage_value <= 100,
  );
  TestValidator.equals(
    "boolean value should be null for percentage flag",
    validPercentageFlag.boolean_value,
    null,
  );
  // Test 2: Create percentage-type flag with boundary value 0% using utility function
  const zeroPercentageFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          flag_type: "percentage",
          status: "inactive",
          percentage_value: 0 satisfies number as number,
          boolean_value: null,
        } satisfies DeepPartial<ICommunityPlatformFeatureFlag.ICreate>,
      },
    );
  typia.assert(zeroPercentageFlag);
  TestValidator.equals(
    "0% percentage value should be accepted",
    zeroPercentageFlag.percentage_value,
    0,
  );
  // Test 3: Create percentage-type flag with boundary value 100% using utility function
  const fullPercentageFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          flag_type: "percentage",
          status: "active",
          percentage_value: 100 satisfies number as number,
          boolean_value: null,
        } satisfies DeepPartial<ICommunityPlatformFeatureFlag.ICreate>,
      },
    );
  typia.assert(fullPercentageFlag);
  TestValidator.equals(
    "100% percentage value should be accepted",
    fullPercentageFlag.percentage_value,
    100,
  );
  // Test 4: Verify flag status and rollout timestamps
  TestValidator.predicate(
    "rollout_started_at should be null initially",
    validPercentageFlag.rollout_started_at === null,
  );
  TestValidator.predicate(
    "rollout_completed_at should be null initially",
    validPercentageFlag.rollout_completed_at === null,
  );
  TestValidator.predicate(
    "created_at should be set",
    validPercentageFlag.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be set",
    validPercentageFlag.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at should be null for active flag",
    validPercentageFlag.deleted_at,
    null,
  );
}
