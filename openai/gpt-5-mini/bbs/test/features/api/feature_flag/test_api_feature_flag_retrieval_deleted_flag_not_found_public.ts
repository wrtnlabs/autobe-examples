import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";

export async function test_api_feature_flag_retrieval_deleted_flag_not_found_public(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that a public (unauthenticated) caller cannot retrieve a
   *   soft-deleted or otherwise non-public feature flag. The server should
   *   treat archived or inaccessible flags as not-found (or otherwise deny
   *   access) for public callers.
   *
   * Strategy:
   *
   * - Generate a valid UUID to represent a featureFlagId that is not accessible
   *   to public clients.
   * - Call the SDK getter and assert that it throws (indicating non-visibility).
   * - Do NOT assert specific HTTP status codes or inspect error internals.
   */

  // 1) Generate a plausible featureFlagId (valid UUID format)
  const featureFlagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2) Attempt to retrieve the flag as a public caller and expect an error.
  //    We use TestValidator.error with an async callback and await it so that
  //    the test fails if the call unexpectedly succeeds.
  await TestValidator.error(
    "deleted/archived feature flag should not be retrievable by public clients",
    async () => {
      await api.functional.econPoliticalForum.featureFlags.at(connection, {
        featureFlagId,
      });
    },
  );
}
