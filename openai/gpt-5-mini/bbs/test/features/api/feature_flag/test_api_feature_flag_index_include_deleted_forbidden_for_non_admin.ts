import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumFeatureFlag";

/**
 * Validate that non-admin callers cannot request administrative-only data
 * (includeDeleted) from the feature flags listing endpoint.
 *
 * Business rationale: Feature flags may contain soft-deleted records that
 * should be visible only to administrators. Non-admin or unauthenticated
 * callers must be prevented from requesting `includeDeleted=true`.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by copying the provided connection and
 *    setting headers: {} (the allowed pattern for unauthenticated calls).
 * 2. Attempt to call the administrative featureFlags.index endpoint with
 *    includeDeleted: true and a normal pagination payload.
 * 3. Assert that the call throws (permission/authorization rejection) using
 *    TestValidator.error. The test asserts failure occurred, not a specific
 *    HTTP status code or message, making the test robust to server
 *    implementation details while still validating the permission restriction.
 */
export async function test_api_feature_flag_index_include_deleted_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (allowed pattern) and do not touch headers after creation
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to request administrative-only data as a non-admin caller. Expect an error.
  await TestValidator.error(
    "non-admin callers must not be able to request includeDeleted",
    async () => {
      await api.functional.econPoliticalForum.administrator.featureFlags.index(
        unauthConn,
        {
          body: {
            includeDeleted: true,
            page: 1,
            limit: 20,
          } satisfies IEconPoliticalForumFeatureFlag.IRequest,
        },
      );
    },
  );
}
