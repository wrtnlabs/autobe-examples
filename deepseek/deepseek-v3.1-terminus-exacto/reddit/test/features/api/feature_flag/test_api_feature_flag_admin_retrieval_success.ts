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
 * Test successful retrieval of a feature flag configuration by an authenticated platform administrator.
 *
 * This test validates that administrators can access detailed feature flag information including
 * core configuration, environment settings, targeting rules, and rollout status. The test verifies
 * that the response contains all expected fields from the ICommunityPlatformFeatureFlag schema.
 */
export async function test_api_feature_flag_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated admin user for authorization
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
  // Retrieve feature flag using the authenticated admin connection
  const featureFlag =
    await api.functional.communityPlatform.admin.feature_flags.at(
      adminConnection,
      {
        featureFlagId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(featureFlag);
  // The typia.assert() above performs complete validation including:
  // - All property existence checks
  // - All type checks (string, number, boolean, etc.)
  // - All format validations (UUID, email, date-time)
  // - All constraint validations (min, max, pattern)
  // - All enum/union type validations
  // No additional validation is needed or allowed after typia.assert()
}
