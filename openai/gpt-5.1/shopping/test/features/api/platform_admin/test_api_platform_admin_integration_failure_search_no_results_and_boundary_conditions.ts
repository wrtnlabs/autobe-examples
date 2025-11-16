import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallLoggingIntegrationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingIntegrationFailure";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate integration failure search behavior for empty results and pagination
 * boundary conditions as a platform admin.
 *
 * Business flow:
 *
 * 1. Join as a platform admin so that all subsequent calls have admin
 *    authorization.
 * 2. Call the integrationFailures search endpoint with filters that should yield
 *    an empty result set (future time window and unlikely categories). Assert
 *    that data is empty and pagination reflects zero records.
 * 3. Call the endpoint with the minimal allowed pagination (page=1, limit=1) and a
 *    realistic filter set. Since we cannot guarantee fixture data, assert only
 *    that the number of items is between 0 and the effective limit and that
 *    pagination is self‑consistent.
 * 4. Call the endpoint with limit at the documented maximum (200) and verify that
 *    the pagination.limit in the response is > 0 and <= 200 and that the data
 *    length does not exceed pagination.limit.
 * 5. Call the endpoint omitting optional filters (once with only page/limit, and
 *    once with a completely empty body) and ensure that the endpoint still
 *    responds successfully with valid pagination/data structures.
 */
export async function test_api_platform_admin_integration_failure_search_no_results_and_boundary_conditions(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (establish authorization context)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Helper: basic structural assertions for page responses
  const assertPageConsistency = (
    title: string,
    page: IPageIShoppingMallLoggingIntegrationFailure.ISummary,
  ): void => {
    typia.assert<IPageIShoppingMallLoggingIntegrationFailure.ISummary>(page);

    const pagination = page.pagination;
    const data = page.data;

    // records >= data.length
    TestValidator.predicate(
      `${title} - records must be >= data length`,
      pagination.records >= data.length,
    );

    // pages == 0 implies records == 0 and current == 0
    if (pagination.pages === 0) {
      TestValidator.equals(
        `${title} - pages=0 implies records=0`,
        pagination.records,
        0,
      );
      TestValidator.equals(
        `${title} - pages=0 implies current=0`,
        pagination.current,
        0,
      );
    } else {
      // pages > 0 implies records > 0
      TestValidator.predicate(
        `${title} - pages>0 implies records>0`,
        pagination.records > 0,
      );
      // current in [0, pages-1]
      TestValidator.predicate(
        `${title} - current within valid range`,
        pagination.current >= 0 && pagination.current < pagination.pages,
      );
    }

    // limit is non‑negative and data length <= limit (unless limit is 0)
    TestValidator.predicate(
      `${title} - limit non‑negative`,
      pagination.limit >= 0,
    );
    if (pagination.limit > 0) {
      TestValidator.predicate(
        `${title} - data length <= limit`,
        data.length <= pagination.limit,
      );
    }
  };

  // 2. Request with filters that should yield no results
  const farFutureFrom = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureTo = new Date(
    Date.now() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const emptyFilterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    from: farFutureFrom,
    to: farFutureTo,
    failureCategories: [
      "timeout",
      "invalid_response",
      "authentication_error",
      "throttling",
      "transport_error",
      "internal_mapping_error",
      "unknown",
    ],
    severityLevels: ["info", "warning", "error", "critical"],
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const emptyPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: emptyFilterBody,
      },
    );
  assertPageConsistency("empty-filter", emptyPage);

  // When time window is far in the future, we expect no incidents.
  TestValidator.equals(
    "empty-filter - data must be empty for far future window",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty-filter - records must be 0 for far future window",
    emptyPage.pagination.records,
    0,
  );

  // 3. Minimal pagination (page=1, limit=1) with realistic filters
  const minimalBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "occurred_at" as const,
    sortOrder: "desc" as const,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const minimalPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: minimalBody,
      },
    );
  assertPageConsistency("minimal-pagination", minimalPage);

  // Data length must be between 0 and limit (1)
  TestValidator.predicate(
    "minimal-pagination - data length between 0 and limit",
    minimalPage.data.length >= 0 && minimalPage.data.length <= 1,
  );

  // 4. Upper-bound limit (200)
  const maxLimitBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 200 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const maxLimitPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: maxLimitBody,
      },
    );
  assertPageConsistency("max-limit", maxLimitPage);

  TestValidator.predicate(
    "max-limit - pagination.limit within 1..200",
    maxLimitPage.pagination.limit >= 1 && maxLimitPage.pagination.limit <= 200,
  );
  TestValidator.predicate(
    "max-limit - data length <= pagination.limit",
    maxLimitPage.data.length <= maxLimitPage.pagination.limit,
  );

  // 5. Requests omitting optional filters
  // 5-1. Only page/limit
  const pageLimitOnlyBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const pageLimitOnlyPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: pageLimitOnlyBody,
      },
    );
  assertPageConsistency("page-limit-only", pageLimitOnlyPage);

  // 5-2. Completely empty body (relying on defaults in the backend)
  const emptyBody =
    {} satisfies IShoppingMallLoggingIntegrationFailure.IRequest;

  const defaultedPage: IPageIShoppingMallLoggingIntegrationFailure.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.integrationFailures.index(
      connection,
      {
        body: emptyBody,
      },
    );
  assertPageConsistency("empty-body", defaultedPage);
}
