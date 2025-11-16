import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityIncidentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityIncidentReport";
import type { IShoppingMallSecurityIncidentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityIncidentSummary";

/**
 * Validate advanced filtering and pagination for security incident reports.
 *
 * Business intent
 *
 * - A platform administrator should be able to authenticate, query security
 *   incident reports with rich filters (categories, severities, principals,
 *   IPs), and navigate across pages while the backend consistently enforces
 *   those filters.
 *
 * Steps
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join and obtain an
 *    authorized session.
 * 2. Perform an initial broad PATCH
 *    /shoppingMall/platformAdmin/reports/logging/securityIncidents request to
 *    retrieve the first page of incidents.
 * 3. If there is at least one incident, derive representative filter values
 *    (category, severity, principal, IP, and a search token) from that
 *    incident.
 * 4. Re-query the endpoint with those advanced filters and tight pagination
 *    (page=1, limit=10, ordered by occurredAt ascending) and assert that every
 *    returned incident satisfies the filter constraints.
 * 5. When the filtered result has more records than a single page, request page 2
 *    with the same filters and ensure there is no overlap between incident IDs
 *    on pages 1 and 2.
 * 6. Optionally, if a non-empty summary is available, perform a search query using
 *    a term from the summary and assert that all returned summaries contain
 *    that term (case-insensitive).
 */
export async function test_api_platform_admin_security_incident_report_advanced_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authentication bootstrap)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Initial broad incident query (page 1, limit 20)
  const initialRequestBody = {
    page: 1,
    limit: 20,
    orderBy: "occurredAt",
    orderDirection: "asc",
  } satisfies IShoppingMallSecurityIncidentReport.IRequest;

  const initialReport =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      { body: initialRequestBody },
    );
  typia.assert<IShoppingMallSecurityIncidentReport>(initialReport);

  const initialPagination = initialReport.pagination;
  typia.assert<IPage.IPagination>(initialPagination);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page should be non-negative",
    initialPagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    initialPagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    initialPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    initialPagination.pages >= 0,
  );

  const initialIncidents = initialReport.data;

  // If no incidents exist, we can only validate that the endpoint responds and
  // pagination metadata is coherent. Advanced filter tests require at least
  // one reference incident.
  if (initialIncidents.length === 0) return;

  const baseIncident = initialIncidents[0];

  // 3. Derive concrete filter values from a representative incident
  const categories: string[] = [baseIncident.category];
  const severities: string[] = [baseIncident.severity];

  const principalTypes: string[] = [];
  const principalIds: string[] = [];
  const ipAddresses: string[] = [];

  if (baseIncident.principalType !== undefined) {
    principalTypes.push(baseIncident.principalType);
  }
  if (baseIncident.principalId !== undefined) {
    principalIds.push(baseIncident.principalId);
  }
  if (baseIncident.ipAddress !== undefined) {
    ipAddresses.push(baseIncident.ipAddress);
  }

  // Build advanced filter body; only include principal / ip filters when we
  // actually have values, so that we don't force the backend to match
  // undefined.
  const advancedFilterBodyBase: IShoppingMallSecurityIncidentReport.IRequest = {
    categories,
    severities,
    page: 1,
    limit: 10,
    orderBy: "occurredAt",
    orderDirection: "asc",
  };

  if (principalTypes.length > 0)
    advancedFilterBodyBase.principalTypes = principalTypes;
  if (principalIds.length > 0)
    advancedFilterBodyBase.principalIds = principalIds;
  if (ipAddresses.length > 0) advancedFilterBodyBase.ipAddresses = ipAddresses;

  const advancedFilterBody =
    advancedFilterBodyBase satisfies IShoppingMallSecurityIncidentReport.IRequest;

  // 4. Filtered first-page query
  const filteredReportPage1 =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      { body: advancedFilterBody },
    );
  typia.assert<IShoppingMallSecurityIncidentReport>(filteredReportPage1);

  const paginationPage1 = filteredReportPage1.pagination;
  typia.assert<IPage.IPagination>(paginationPage1);

  const incidentsPage1 = filteredReportPage1.data;

  // Validate that each incident in page 1 respects filters
  for (const incident of incidentsPage1) {
    TestValidator.predicate(
      "incident category should be within requested categories",
      categories.includes(incident.category),
    );
    TestValidator.predicate(
      "incident severity should be within requested severities",
      severities.includes(incident.severity),
    );

    if (advancedFilterBody.principalTypes !== undefined) {
      TestValidator.predicate(
        "incident principalType should match requested principalTypes when filtered",
        incident.principalType !== undefined &&
          advancedFilterBody.principalTypes.includes(incident.principalType),
      );
    }
    if (advancedFilterBody.principalIds !== undefined) {
      TestValidator.predicate(
        "incident principalId should match requested principalIds when filtered",
        incident.principalId !== undefined &&
          advancedFilterBody.principalIds.includes(incident.principalId),
      );
    }
    if (advancedFilterBody.ipAddresses !== undefined) {
      TestValidator.predicate(
        "incident ipAddress should match requested ipAddresses when filtered",
        incident.ipAddress !== undefined &&
          advancedFilterBody.ipAddresses.includes(incident.ipAddress),
      );
    }
  }

  // 5. Pagination to second page when more than one page exists
  if (paginationPage1.records > paginationPage1.limit) {
    const page2BodyBase: IShoppingMallSecurityIncidentReport.IRequest = {
      ...advancedFilterBody,
      page: 2,
    };
    const page2Body =
      page2BodyBase satisfies IShoppingMallSecurityIncidentReport.IRequest;

    const filteredReportPage2 =
      await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
        connection,
        { body: page2Body },
      );
    typia.assert<IShoppingMallSecurityIncidentReport>(filteredReportPage2);

    const paginationPage2 = filteredReportPage2.pagination;
    typia.assert<IPage.IPagination>(paginationPage2);

    const incidentsPage2 = filteredReportPage2.data;

    const idsPage1 = new Set(incidentsPage1.map((i) => i.id));

    for (const incident of incidentsPage2) {
      // Ensure no overlap between page 1 and page 2 IDs
      TestValidator.predicate(
        "no overlap of incident IDs between page 1 and page 2",
        idsPage1.has(incident.id) === false,
      );

      // Re-validate filters on page 2 incidents
      TestValidator.predicate(
        "page 2 incident category should be within requested categories",
        categories.includes(incident.category),
      );
      TestValidator.predicate(
        "page 2 incident severity should be within requested severities",
        severities.includes(incident.severity),
      );

      if (advancedFilterBody.principalTypes !== undefined) {
        TestValidator.predicate(
          "page 2 incident principalType should match requested principalTypes",
          incident.principalType !== undefined &&
            advancedFilterBody.principalTypes.includes(incident.principalType),
        );
      }
      if (advancedFilterBody.principalIds !== undefined) {
        TestValidator.predicate(
          "page 2 incident principalId should match requested principalIds",
          incident.principalId !== undefined &&
            advancedFilterBody.principalIds.includes(incident.principalId),
        );
      }
      if (advancedFilterBody.ipAddresses !== undefined) {
        TestValidator.predicate(
          "page 2 incident ipAddress should match requested ipAddresses",
          incident.ipAddress !== undefined &&
            advancedFilterBody.ipAddresses.includes(incident.ipAddress),
        );
      }
    }
  }

  // 6. Optional search-based filtering using a token from baseIncident.summary
  if (baseIncident.summary.length > 0) {
    // Use a simple substring from the beginning of the summary as search term
    const rawSummary = baseIncident.summary;
    const searchTerm =
      rawSummary.length <= 16 ? rawSummary : rawSummary.substring(0, 16);

    const searchBodyBase: IShoppingMallSecurityIncidentReport.IRequest = {
      search: searchTerm,
      page: 1,
      limit: 10,
      orderBy: "occurredAt",
      orderDirection: "asc",
    };

    const searchBody =
      searchBodyBase satisfies IShoppingMallSecurityIncidentReport.IRequest;

    const searchReport =
      await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
        connection,
        { body: searchBody },
      );
    typia.assert<IShoppingMallSecurityIncidentReport>(searchReport);

    for (const incident of searchReport.data) {
      TestValidator.predicate(
        "search result incident summaries should contain search term (case-insensitive)",
        incident.summary.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
}
