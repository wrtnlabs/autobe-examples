import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumFeatureFlag";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumFeatureFlag";

/**
 * Validate administrator listing of feature flags with filters and pagination.
 *
 * Business context: Administrators must be able to query the central
 * feature-flags catalog to inspect flags that control runtime behavior (for
 * example: moderation controls). This test registers a new administrator,
 * issues a search request with filter constraints (key prefix, enabled state,
 * rollout percentage bounds), and validates that the returned page and items
 * conform to the requested constraints.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/administrator/join and obtain tokens (SDK
 *    assigns Authorization header on the provided connection).
 * 2. Prepare a request body that satisfies IEconPoliticalForumFeatureFlag.IRequest
 *    with key prefix 'moderation.', enabled=true, rolloutMin=0, rolloutMax=100,
 *    page=1, limit=25, sort='key', direction='asc'.
 * 3. Call PATCH /econPoliticalForum/administrator/featureFlags and await the
 *    IPageIEconPoliticalForumFeatureFlag.ISummary response.
 * 4. Typia.assert(response) to ensure full type compliance.
 * 5. Business validations:
 *
 *    - Pagination.current === requested page
 *    - Pagination.limit === requested limit
 *    - Pagination.records >= response.data.length
 *    - For each feature flag summary: if rollout_percentage exists, it must be
 *         between rolloutMin and rolloutMax
 */
export async function test_api_feature_flag_index_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration (creates admin context and sets Authorization)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
        username: RandomGenerator.name(1).toLowerCase(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // Ensure token shape (not strictly necessary but documents expected flow)
  typia.assert<IAuthorizationToken>(admin.token);

  // 2) Prepare request body using exact DTO property names
  const page = 1;
  const limit = 25;
  const rolloutMin = 0;
  const rolloutMax = 100;

  const requestBody = {
    key: "moderation.",
    enabled: true,
    rolloutMin,
    rolloutMax,
    sort: "key",
    direction: "asc",
    page,
    limit,
  } satisfies IEconPoliticalForumFeatureFlag.IRequest;

  // 3) Call the index API and await response
  const output: IPageIEconPoliticalForumFeatureFlag.ISummary =
    await api.functional.econPoliticalForum.administrator.featureFlags.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4) Type validation: typia.assert validates all format tags, UUIDs, and shapes
  typia.assert(output);

  // 5) Business validations using TestValidator
  TestValidator.equals(
    "pagination: current page matches request",
    output.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination: limit matches request",
    output.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination: pages is at least 1",
    output.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination: records is not less than returned page size",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "returned data length does not exceed limit",
    output.data.length <= limit,
  );

  // Validate each returned feature flag summary for business constraints
  for (const flag of output.data) {
    // typia.assert(output) already validated the structure and types.
    // Additional business checks:
    if (
      flag.rollout_percentage !== null &&
      flag.rollout_percentage !== undefined
    ) {
      TestValidator.predicate(
        `rollout_percentage for ${flag.key} within requested bounds`,
        flag.rollout_percentage >= rolloutMin &&
          flag.rollout_percentage <= rolloutMax,
      );
    }
  }
}
