import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import type { ICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlagEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironment";
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

export async function test_api_feature_flags_environment_batch_update_enabled_status(
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
  // Create a feature flag
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "percentage",
          status: "active",
          percentage_value: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformFeatureFlag.ICreate,
      },
    );
  typia.assert(featureFlag);
  // Perform batch update on environments filtering by rollout percentage range 0-50
  const updateResponse =
    await api.functional.communityPlatform.admin.feature_flags.environments.index(
      adminConnection,
      {
        featureFlagId: featureFlag.id,
        body: {
          rollout_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
          >(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformFeatureFlagEnvironment.IRequest,
      },
    );
  typia.assert(updateResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    updateResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    updateResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", updateResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    updateResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    updateResponse.pagination.pages >= 0,
  );
  // Validate environment summaries structure
  if (updateResponse.data.length > 0) {
    TestValidator.predicate(
      "environments have valid structure",
      updateResponse.data.every((env) => {
        return (
          typeof env.id === "string" &&
          typeof env.is_enabled === "boolean" &&
          (env.rollout_percentage === null ||
            (typeof env.rollout_percentage === "number" &&
              env.rollout_percentage >= 0 &&
              env.rollout_percentage <= 100)) &&
          typeof env.created_at === "string"
        );
      }),
    );
  }
}
