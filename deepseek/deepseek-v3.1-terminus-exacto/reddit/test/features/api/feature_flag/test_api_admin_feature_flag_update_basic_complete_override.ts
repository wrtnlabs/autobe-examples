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
 * Test the complete feature flag update workflow including authentication, prerequisite flag creation,
 * and full configuration override. Validates comprehensive field updates and type-dependent value handling.
 */
export async function test_api_admin_feature_flag_update_basic_complete_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create initial feature flag with boolean configuration
  const initialFlag =
    await generate_random_community_platform_admin_feature_flags_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "boolean" as const,
          status: "active" as const,
          boolean_value: true,
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(initialFlag);
  // 3. Execute comprehensive update operation
  const updateData: ICommunityPlatformFeatureFlag.IUpdate = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    flag_type: "percentage" as const,
    status: "inactive" as const,
    percentage_value: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    boolean_value: null, // Should be nulled when switching from boolean to percentage
  };
  const updatedFlag =
    await api.functional.communityPlatform.admin.feature_flags.update(
      adminConnection,
      {
        featureFlagId: initialFlag.id,
        body: updateData,
      },
    );
  typia.assert(updatedFlag);
  // 4. Validate all changes applied correctly
  TestValidator.equals("name updated", updatedFlag.name, updateData.name!);
  TestValidator.equals(
    "description updated",
    updatedFlag.description,
    updateData.description!,
  );
  TestValidator.equals(
    "flag type changed",
    updatedFlag.flag_type,
    updateData.flag_type!,
  );
  TestValidator.equals(
    "status changed",
    updatedFlag.status,
    updateData.status!,
  );
  TestValidator.equals(
    "percentage value set",
    updatedFlag.percentage_value,
    updateData.percentage_value!,
  );
  TestValidator.equals("boolean value nulled", updatedFlag.boolean_value, null);
  // 5. Validate timestamp updates
  TestValidator.notEquals(
    "updated_at changed",
    updatedFlag.updated_at,
    initialFlag.updated_at,
  );
  // 6. Validate immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedFlag.id, initialFlag.id);
  TestValidator.equals(
    "created_at unchanged",
    updatedFlag.created_at,
    initialFlag.created_at,
  );
}
