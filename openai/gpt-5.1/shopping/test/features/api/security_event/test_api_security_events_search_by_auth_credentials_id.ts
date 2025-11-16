import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Verify platform-admin-scoped security event search by authentication
 * credentials id.
 *
 * Business intent:
 *
 * - A platform administrator, once registered, should be able to query security
 *   events through the platform-admin securityEvents index API.
 * - The query DTO IShoppingMallSecurityEvent.IRequest supports filtering by
 *   auth_credentials_id, which binds events to an authentication credentials
 *   record. This test exercises that filter path and validates pagination and
 *   empty-state behavior.
 *
 * Due to available DTOs, event summaries do not expose auth_credentials_id, so
 * the test treats the filter as a black box: it verifies that requests using
 * the filter are accepted, return well-typed paginated data, and behave
 * consistently, rather than re-deriving auth_credentials_id from the payload.
 *
 * Test flow:
 *
 * 1. Join a new platform administrator using POST /auth/platformAdmin/join.
 *
 *    - Build a realistic IShoppingMallPlatformAdminJoin.IRequest payload.
 *    - Ensure the response is a valid IShoppingMallPlatformAdmin.IAuthorized object
 *         using typia.assert.
 *    - Rely on the SDK to inject Authorization header into the connection.
 * 2. Perform an unfiltered security events search as a baseline.
 *
 *    - Call PATCH /shoppingMall/platformAdmin/securityEvents with
 *         IShoppingMallSecurityEvent.IRequest containing explicit page and
 *         limit but omitting auth_credentials_id.
 *    - Assert the result is a valid IPageIShoppingMallSecurityEvent.ISummary.
 *    - Validate basic pagination invariants using TestValidator:
 *
 *         - Current >= 0, limit >= 0, records >= 0, pages >= 0.
 *         - If records === 0, pages === 0 and data.length === 0.
 *         - If records > 0, data.length <= limit.
 * 3. Query with a random auth_credentials_id filter.
 *
 *    - Generate a random UUID (string & tags.Format<"uuid">) to use as
 *         auth_credentials_id.
 *    - Call securityEvents.index with the same page/limit but with
 *         auth_credentials_id set.
 *    - Assert response type and re-apply pagination invariants.
 *    - This verifies that the backend accepts and processes the auth_credentials_id
 *         filter without breaking pagination or type contracts, even when the
 *         filter yields no matches.
 * 4. Repeat the filtered query to validate stability and empty-state handling.
 *
 *    - Call securityEvents.index again with the same auth_credentials_id and
 *         pagination parameters.
 *    - Use TestValidator.equals to ensure that key pagination metadata is stable for
 *         identical queries within the same test run (current, limit, records,
 *         pages) and that data arrays match when records === 0.
 *    - Specifically validate the empty-state semantics when records === 0: pages ===
 *         0 and data.length === 0.
 *
 * The test focuses on realistic admin bootstrap, correct use of the
 * IShoppingMallSecurityEvent.IRequest DTO, and robust validation of
 * pagination/empty-state behavior around the auth_credentials_id filter, within
 * the limits of the exposed DTOs and available SDK functions.
 */
export async function test_api_security_events_search_by_auth_credentials_id(
  connection: api.IConnection,
) {
  // 1. Join a new platform administrator to get an authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Basic sanity on admin identity
  TestValidator.predicate(
    "platform admin id should be a non-empty UUID string",
    () => admin.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin email should match requested email",
    () => admin.email === joinBody.email,
  );

  // 2. Baseline: unfiltered security events search
  const baselineRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const baselinePage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(baselinePage);

  // Validate baseline pagination invariants
  const baselinePagination = baselinePage.pagination;
  TestValidator.predicate(
    "baseline current page index should be >= 0",
    baselinePagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline limit should be >= 0",
    baselinePagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline records should be >= 0",
    baselinePagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages should be >= 0",
    baselinePagination.pages >= 0,
  );

  if (baselinePagination.records === 0) {
    TestValidator.equals(
      "when no records, pages should be 0",
      baselinePagination.pages,
      0,
    );
    TestValidator.equals(
      "when no records, data array should be empty",
      baselinePage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when there are records, page data length must not exceed limit",
      baselinePage.data.length <= baselinePagination.limit,
    );
  }

  // 3. Filtered query by random auth_credentials_id
  const randomAuthCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const filteredRequest = {
    page: baselineRequest.page,
    limit: baselineRequest.limit,
    auth_credentials_id: randomAuthCredentialsId,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const filteredPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(filteredPage);

  const filteredPagination = filteredPage.pagination;
  TestValidator.predicate(
    "filtered current page index should be >= 0",
    filteredPagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered limit should be >= 0",
    filteredPagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered records should be >= 0",
    filteredPagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pages should be >= 0",
    filteredPagination.pages >= 0,
  );

  if (filteredPagination.records === 0) {
    TestValidator.equals(
      "when no filtered records, pages should be 0",
      filteredPagination.pages,
      0,
    );
    TestValidator.equals(
      "when no filtered records, data array should be empty",
      filteredPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when filtered has records, page data length must not exceed limit",
      filteredPage.data.length <= filteredPagination.limit,
    );
  }

  // 4. Repeat filtered query to validate stability for identical request
  const filteredPageAgain: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(filteredPageAgain);

  const filteredPaginationAgain = filteredPageAgain.pagination;

  TestValidator.equals(
    "filtered pagination current should be stable across identical queries",
    filteredPaginationAgain.current,
    filteredPagination.current,
  );
  TestValidator.equals(
    "filtered pagination limit should be stable across identical queries",
    filteredPaginationAgain.limit,
    filteredPagination.limit,
  );
  TestValidator.equals(
    "filtered pagination records should be stable across identical queries",
    filteredPaginationAgain.records,
    filteredPagination.records,
  );
  TestValidator.equals(
    "filtered pagination pages should be stable across identical queries",
    filteredPaginationAgain.pages,
    filteredPagination.pages,
  );

  if (filteredPagination.records === 0) {
    TestValidator.equals(
      "when filtered records are 0, repeated data array should also be empty",
      filteredPageAgain.data.length,
      0,
    );
  }
}
