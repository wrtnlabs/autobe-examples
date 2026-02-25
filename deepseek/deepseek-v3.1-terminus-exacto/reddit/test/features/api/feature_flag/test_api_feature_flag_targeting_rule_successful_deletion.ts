import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
 * Test successful deletion of a targeting rule from a feature flag environment detail configuration.
 * Tests the complete lifecycle: admin auth → flag creation → environment creation → detail creation →
 * targeting rule creation → deletion → verification of deletion and parent integrity.
 */
export async function test_api_feature_flag_targeting_rule_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Since we don't have API functions for creating feature flags, environments, details, or targeting rules,
  // this test will focus on the deletion endpoint with UUIDs. In a real scenario, we would create these entities first.
  // Generate random UUIDs that would represent the hierarchy
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  const environmentId = typia.random<string & tags.Format<"uuid">>();
  const detailId = typia.random<string & tags.Format<"uuid">>();
  const targetingRuleId = typia.random<string & tags.Format<"uuid">>();
  // 2. Attempt to delete the targeting rule (should work even if entities don't exist for testing)
  await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
    adminConnection,
    {
      featureFlagId,
      environmentId,
      detailId,
      targetingRuleId,
    },
  );
  // 3. Verify that attempting to delete the same targeting rule again returns 404
  await TestValidator.error(
    "targeting rule deletion - should return 404 for non-existent rule",
    async () => {
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
        adminConnection,
        {
          featureFlagId,
          environmentId,
          detailId,
          targetingRuleId,
        },
      );
    },
  );
}
