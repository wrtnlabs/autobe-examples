import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppFeatureFlag";

export async function test_api_feature_flag_get_unauthorized(
  connection: api.IConnection,
) {
  // Purpose: Ensure unauthenticated clients cannot access admin-only feature flag details.
  // Business rationale: Feature flag details are administrative and may contain
  // operational metadata; only admin actors should access them.

  // 1) Use a plausible feature flag key (non-empty string)
  const featureFlagKey = "beta_feature";

  // 2) Attempt to retrieve the feature flag without performing any authentication.
  // Expectation: The endpoint denies access. Accept either 401 Unauthorized or
  // 403 Forbidden depending on server behavior.
  await TestValidator.httpError(
    "unauthenticated client should be denied access to admin feature flag",
    [401, 403],
    async () => {
      await api.functional.todoApp.admin.featureFlags.at(connection, {
        featureFlagKey,
      });
    },
  );
}
