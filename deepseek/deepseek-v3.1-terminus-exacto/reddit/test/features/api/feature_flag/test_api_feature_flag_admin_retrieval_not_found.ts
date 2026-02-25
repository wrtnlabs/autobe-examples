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

/**
 * Test that administrators receive appropriate 404 error when attempting to retrieve a non-existent feature flag.
 * Validates that the system properly handles invalid feature flag IDs by returning a not found response
 * rather than exposing internal errors.
 */
export async function test_api_feature_flag_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate a random UUID that doesn't exist in the system
  const nonExistentFeatureFlagId: string & typia.tags.Format<"uuid"> =
    typia.random<string & typia.tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent feature flag and validate 404 error
  await TestValidator.httpError(
    "retrieve non-existent feature flag should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.at(
        adminConnection,
        {
          featureFlagId: nonExistentFeatureFlagId,
        },
      );
    },
  );
}
