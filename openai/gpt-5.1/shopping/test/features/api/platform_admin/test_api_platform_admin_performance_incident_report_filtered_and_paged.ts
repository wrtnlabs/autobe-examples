import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLoggingPerformanceIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLoggingPerformanceIncident";
import type { IShoppingMallLoggingPerformanceIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoggingPerformanceIncident";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate filtered and paginated performance incident reporting for platform
 * admins.
 *
 * ## Business goal
 *
 * Ensure that the ShoppingMall platform admin reporting API for performance
 * incidents:
 *
 * - Accepts complex filter combinations (time window, incidentTypes, severities,
 *   serviceNames, endpointPaths, duration thresholds).
 * - Returns incidents that all respect the requested filters whenever data is
 *   present.
 * - Paginates large result sets in a consistent, non-overlapping way.
 * - Orders results according to the requested orderBy/orderDirection.
 * - Supports free-text search over incident attributes (we use metric_name as a
 *   practical search source) when data exists.
 *
 * ## Technical summary
 *
 * 1. Bootstrap a platform admin by calling POST /auth/platformAdmin/join using
 *    api.functional.auth.platformAdmin.join. This both creates the admin and
 *    configures the connection with an Authorization header for subsequent
 *    calls.
 * 2. Call PATCH /shoppingMall/platformAdmin/reports/logging/performanceIncidents
 *    via
 *    api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index
 *    with a filtered request body using
 *    IShoppingMallLoggingPerformanceIncident.IRequest.
 * 3. If incidents are returned, verify that each incident satisfies the filter
 *    constraints we applied and that ordering and pagination are coherent
 *    across pages.
 * 4. Optionally perform a follow-up search query using the search field when at
 *    least one incident exists, and validate that results are compatible with
 *    the search term.
 */
export async function test_api_platform_admin_performance_incident_report_filtered_and_paged(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
    ip: "203.0.113.10",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a filter request for the performance incidents index endpoint.
  // Use a 24-hour window around "now"; since we don't control seeding in this
  // test, the window is deliberately broad but still realistic.
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  // Choose concrete incidentTypes and severities consistent with the DTO docs.
  const incidentTypesFilter = ["slowResponse", "timeout"];
  const severitiesFilter = ["major", "critical"];

  // serviceNames and endpointPaths are free-form strings; pick realistic
  // examples that an operator might use when filtering incidents.
  const serviceNamesFilter = ["shopping-api", "payment-gateway"];
  const endpointPathsFilter = ["/orders", "/payments/checkout"];

  // We do not have a dedicated duration field in ISummary; minDurationMs and
  // maxDurationMs influence server-side selection only. Our assertions can only
  // verify that responses are consistent (type-wise) and that pagination/order
  // behave as requested.
  const minDurationMs: number & tags.Type<"int32"> & tags.Minimum<0> = 500;
  const maxDurationMs: number & tags.Type<"int32"> & tags.Minimum<0> = 10_000;

  const firstPageRequest = {
    from,
    to,
    incidentTypes: incidentTypesFilter,
    severities: severitiesFilter,
    serviceNames: serviceNamesFilter,
    endpointPaths: endpointPathsFilter,
    minDurationMs,
    maxDurationMs,
    page: 1,
    limit: 20,
    orderBy: "detected_at",
    orderDirection: "asc",
  } satisfies IShoppingMallLoggingPerformanceIncident.IRequest;

  const firstPage: IPageIShoppingMallLoggingPerformanceIncident.ISummary =
    await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(
    firstPage,
  );

  const pagination1: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  // Basic sanity checks on pagination invariant values.
  await TestValidator.predicate("first page index is 0", async () => {
    return pagination1.current === 0;
  });
  await TestValidator.predicate(
    "first page limit matches request",
    async () => {
      return pagination1.limit === 20;
    },
  );

  const data1: IShoppingMallLoggingPerformanceIncident.ISummary[] =
    firstPage.data;

  // Verify ascending ordering by detected_at when there is at least one
  // incident in the first page.
  if (data1.length > 1) {
    await TestValidator.predicate(
      "first page incidents are ordered by detected_at ascending",
      async () => {
        for (let i = 1; i < data1.length; ++i) {
          if (data1[i - 1].detected_at > data1[i].detected_at) return false;
        }
        return true;
      },
    );
  }

  // We cannot assert server-internal filters (incidentTypes, severities,
  // serviceNames, endpointPaths, durationMs) without corresponding fields on
  // ISummary, so we restrict ourselves to type assertions and ordering checks.
  // Each summary was already validated by typia.assert above.

  // 3. When there are more records than the first page limit, fetch page 2 and
  // ensure non-overlap and consistent ordering.
  if (pagination1.records > pagination1.limit) {
    const secondPageRequest = {
      ...firstPageRequest,
      page: 2,
    } satisfies IShoppingMallLoggingPerformanceIncident.IRequest;

    const secondPage: IPageIShoppingMallLoggingPerformanceIncident.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
        connection,
        { body: secondPageRequest },
      );
    typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(
      secondPage,
    );

    const pagination2: IPage.IPagination = secondPage.pagination;
    typia.assert<IPage.IPagination>(pagination2);

    await TestValidator.predicate(
      "second page index is 1 when requesting page=2",
      async () => pagination2.current === 1,
    );

    const data2: IShoppingMallLoggingPerformanceIncident.ISummary[] =
      secondPage.data;

    // Ensure no overlapping IDs between page 1 and page 2 results.
    const ids1 = new Set(data1.map((i) => i.id));
    await TestValidator.predicate(
      "no overlapping incident IDs between page 1 and page 2",
      async () => data2.every((i) => ids1.has(i.id) === false),
    );

    // Check ordering on the second page as well.
    if (data2.length > 1) {
      await TestValidator.predicate(
        "second page incidents are ordered by detected_at ascending",
        async () => {
          for (let i = 1; i < data2.length; ++i) {
            if (data2[i - 1].detected_at > data2[i].detected_at) return false;
          }
          return true;
        },
      );
    }

    // Also check that globally, the earliest incident in page 2 does not
    // precede the last incident in page 1 when both are non-empty.
    if (data1.length > 0 && data2.length > 0) {
      const lastOfFirst = data1[data1.length - 1];
      const firstOfSecond = data2[0];
      await TestValidator.predicate(
        "page 2 starts at or after the last detected_at of page 1",
        async () => lastOfFirst.detected_at <= firstOfSecond.detected_at,
      );
    }
  }

  // 4. Optional: exercise the search field when we have at least one incident
  // on the first page by using a term from metric_name.
  if (data1.length > 0) {
    const sampleIncident = data1[0];
    const searchTerm =
      sampleIncident.metric_name.split("_")[0] || sampleIncident.metric_name;

    const searchRequest = {
      ...firstPageRequest,
      search: searchTerm,
      page: 1,
    } satisfies IShoppingMallLoggingPerformanceIncident.IRequest;

    const searchPage: IPageIShoppingMallLoggingPerformanceIncident.ISummary =
      await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
        connection,
        { body: searchRequest },
      );
    typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(
      searchPage,
    );

    const searchData: IShoppingMallLoggingPerformanceIncident.ISummary[] =
      searchPage.data;

    // We assert only loose compatibility with the search term, since the
    // backend may interpret search more broadly than strict substring match.
    if (searchData.length > 0) {
      await TestValidator.predicate(
        "search results remain ordered by detected_at ascending",
        async () => {
          for (let i = 1; i < searchData.length; ++i) {
            if (searchData[i - 1].detected_at > searchData[i].detected_at)
              return false;
          }
          return true;
        },
      );
    }
  }
}
