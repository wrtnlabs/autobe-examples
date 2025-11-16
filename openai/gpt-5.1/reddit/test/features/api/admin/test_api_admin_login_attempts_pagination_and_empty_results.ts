import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformLoginAttempt";

/**
 * Validate admin loginAttempts search pagination behavior when filters yield no
 * results.
 *
 * Business goal: Ensure that an authenticated adminUser can query the
 * loginAttempts index endpoint with filters that match zero records and still
 * receive a successful response whose pagination metadata correctly represents
 * an empty dataset.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via join, establishing an authenticated admin
 *    context.
 * 2. Perform several normal login attempts using the same identifier to ensure
 *    there are some login_attempt rows in the system.
 * 3. Call the loginAttempts index endpoint with filters guaranteed to return no
 *    matches (e.g., different identifier and/or a past time window).
 * 4. Assert that the response has an empty data array and pagination metadata
 *    consistent with an empty result set, including current page and limit.
 */
export async function test_api_admin_login_attempts_pagination_and_empty_results(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) to get an authenticated admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password!123",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Perform several normal login attempts for this admin user
  const loginIdentifier = adminAuthorized.email; // use email as identifier

  const loginHref = "https://admin.example.com/login";
  const loginReferrer = "https://admin.example.com/";

  const loginRequest = {
    identifier: loginIdentifier,
    password: joinBody.password,
    ip: null,
    href: loginHref,
    referrer: loginReferrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  // Perform a few login calls to ensure some attempts exist
  for (let i = 0; i < 3; i++) {
    const loginResult: ICommunityPlatformAdminuser.IAuthorized =
      await api.functional.auth.adminUser.login(connection, {
        body: loginRequest,
      });
    typia.assert<ICommunityPlatformAdminuser.IAuthorized>(loginResult);
  }

  // 3. Call loginAttempts index with filters that should yield no results.
  // Strategy A: use a completely different identifier never used before.
  const unmatchedIdentifier = `${RandomGenerator.alphabets(10)}-unmatched`;

  const page = 1;
  const pageSize = 20;

  const emptySearchBody = {
    identifier: unmatchedIdentifier,
    was_successful: null,
    source_ip: null,
    user_agent: null,
    occurred_from: null,
    occurred_to: null,
    page,
    page_size: pageSize,
    sort_by: "occurred_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const pageResult: IPageICommunityPlatformLoginAttempt.ISummary =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      {
        body: emptySearchBody,
      },
    );

  // 4. Validate response structure and business rules
  typia.assert<IPageICommunityPlatformLoginAttempt.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // data should be an empty array when filters match nothing
  TestValidator.equals(
    "loginAttempts index returns empty data for unmatched filters",
    pageResult.data,
    [],
  );

  // records must be zero for empty result sets
  TestValidator.equals(
    "pagination.records is zero for empty loginAttempts search",
    pagination.records,
    0,
  );

  // pages should be 0 or 1 depending on implementation, but never negative
  TestValidator.predicate(
    "pagination.pages is 0 or 1 for empty loginAttempts search",
    pagination.pages === 0 || pagination.pages === 1,
  );

  TestValidator.predicate(
    "pagination.pages is non-negative for empty loginAttempts search",
    pagination.pages >= 0,
  );

  // current page and limit should echo input parameters
  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination.limit equals requested page_size",
    pagination.limit,
    pageSize,
  );

  // Finally, ensure that no errors were thrown purely due to empty result set
  TestValidator.predicate(
    "loginAttempts empty-result search completes without error",
    true,
  );
}
