import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallErrorLog";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin error log search with actor and correlation filters.
 *
 * Business goal: Ensure that a platform administrator, once registered and
 * authenticated via POST /auth/platformAdmin/join, can call the error log index
 * endpoint (PATCH /shoppingMall/platformAdmin/errorLogs) and receive a
 * well-formed paginated response when applying actor-related and
 * correlation-based filters. The test focuses on:
 *
 * - Verifying that authenticated platform admins can access the error log search
 *   endpoint and receive an `IPageIShoppingMallErrorLog.ISummary` payload.
 * - Confirming basic pagination invariants (non-negative current/limit/records
 *   and pages, and consistency between pagination.limit and data length for
 *   non-terminal pages).
 * - Exercising filter fields in `IShoppingMallErrorLog.IRequest` related to actor
 *   identity (actor_type, actor_id) and correlation identifiers
 *   (correlation_id, request_id), while remaining robust to environments where
 *   no actual matching logs exist.
 *
 * Scenario constraints: The public API surface exposed to this test does not
 * provide a way to deterministically emit error logs bound to a specific
 * actor_id or correlation_id. Therefore, we cannot rely on the presence of
 * particular log records. Instead, we:
 *
 * 1. Join a platform admin via POST /auth/platformAdmin/join to establish
 *    authorization context and allow access to admin-only observability APIs.
 * 2. Perform a first, broad search over a recent time window with generic
 *    pagination settings to validate that:
 *
 *    - The endpoint is reachable for an authenticated platform admin.
 *    - The response structurally matches `IPageIShoppingMallErrorLog.ISummary`.
 * 3. Build a second, narrowly scoped `IShoppingMallErrorLog.IRequest` body that
 *    includes:
 *
 *    - Actor_type set to a fixed value such as "customer" (a plausible actor type
 *         used in error logs).
 *    - Actor_id populated with a random UUID.
 *    - Correlation_id and request_id set to deterministic random strings.
 *    - From/to bounding a wide time range (for example, from 24h in the past to 24h
 *         in the future) and a reasonable limit.
 * 4. Call PATCH /shoppingMall/platformAdmin/errorLogs with that filter body.
 * 5. Assert that:
 *
 *    - The response type is `IPageIShoppingMallErrorLog.ISummary` and passes
 *         `typia.assert`.
 *    - Pagination.current, pagination.limit, pagination.records and pagination.pages
 *         satisfy their documented constraints.
 *    - If `pagination.records` is 0, then `data.length` is 0 and the page is a valid
 *         empty page.
 *    - If `data.length` is greater than 0, then for every summary entry:
 *
 *         - Created_at is a valid date-time string (enforced by typia.assert).
 *         - When correlation_id is present on the summary, it equals the correlation_id
 *                   sent in the filter.
 *         - When service_name/component_name exist, they are just asserted for
 *                   type-correctness (business-level correlation between
 *                   actor_id and actor_type cannot be enforced without a
 *                   deterministic fixture).
 *
 * Because we do not have direct control over error log generation, any checks
 * that require specific business semantics beyond these structural and
 * conditional invariants must be omitted. The test focuses on what can be
 * reliably asserted in a black-box environment: that authenticated admins can
 * query error logs, that the API honors the contract of its request/response
 * DTOs, and that filtering by actor/correlation identifiers yields either an
 * empty page or results that align with the filter values exposed in the
 * summary DTO.
 */
export async function test_api_platform_admin_error_logs_index_filter_by_actor_and_correlation(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain authorized session
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Perform a broad error log search to validate basic access and shape
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const broadRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    from,
    to,
  } satisfies IShoppingMallErrorLog.IRequest;

  const broadPage: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: broadRequestBody,
      },
    );
  typia.assert(broadPage);

  const broadPagination = broadPage.pagination;
  TestValidator.predicate(
    "broad pagination current is non-negative",
    broadPagination.current >= 0,
  );
  TestValidator.predicate(
    "broad pagination limit is non-negative",
    broadPagination.limit >= 0,
  );
  TestValidator.predicate(
    "broad pagination records is non-negative",
    broadPagination.records >= 0,
  );
  TestValidator.predicate(
    "broad pagination pages is non-negative",
    broadPagination.pages >= 0,
  );

  // For non-empty result sets, ensure data length does not exceed limit
  if (broadPage.data.length > 0) {
    TestValidator.predicate(
      "broad page data length does not exceed limit",
      broadPage.data.length <= broadPagination.limit,
    );
  }

  // 3. Build a narrow filter using actor and correlation identifiers
  const narrowActorType = "customer";
  const narrowActorId = typia.random<string & tags.Format<"uuid">>();
  const narrowCorrelationId = RandomGenerator.alphaNumeric(16);
  const narrowRequestId = RandomGenerator.alphaNumeric(16);

  const narrowRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    from,
    to,
    actor_type: narrowActorType,
    actor_id: narrowActorId,
    correlation_id: narrowCorrelationId,
    request_id: narrowRequestId,
  } satisfies IShoppingMallErrorLog.IRequest;

  const narrowPage: IPageIShoppingMallErrorLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.errorLogs.index(
      connection,
      {
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowPage);

  const narrowPagination = narrowPage.pagination;
  TestValidator.predicate(
    "narrow pagination current is non-negative",
    narrowPagination.current >= 0,
  );
  TestValidator.predicate(
    "narrow pagination limit is non-negative",
    narrowPagination.limit >= 0,
  );
  TestValidator.predicate(
    "narrow pagination records is non-negative",
    narrowPagination.records >= 0,
  );
  TestValidator.predicate(
    "narrow pagination pages is non-negative",
    narrowPagination.pages >= 0,
  );

  if (narrowPagination.records === 0) {
    // When there are no matching logs, ensure the data array is empty
    TestValidator.equals(
      "narrow page has no data when records is zero",
      narrowPage.data.length,
      0,
    );
  } else {
    // When there are results, verify basic invariants and conditional filters
    TestValidator.predicate(
      "narrow page data length is positive",
      narrowPage.data.length > 0,
    );
    TestValidator.predicate(
      "narrow page data length does not exceed limit",
      narrowPage.data.length <= narrowPagination.limit,
    );

    for (const summary of narrowPage.data) {
      typia.assert<IShoppingMallErrorLog.ISummary>(summary);

      // If correlation_id is present on the summary, it should match the filter
      if (summary.correlation_id !== undefined) {
        TestValidator.equals(
          "summary correlation_id matches filter when present",
          summary.correlation_id,
          narrowCorrelationId,
        );
      }
    }
  }
}
