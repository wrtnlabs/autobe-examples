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
 * Validate basic security incident reporting with minimal filters for a
 * platform admin.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authorized session.
 *
 *    - Use realistic email/URI values matching
 *         IShoppingMallPlatformAdminJoin.IRequest.
 *    - Rely on SDK to store the access token into the connection for subsequent
 *         calls.
 * 2. Build a minimal but valid IShoppingMallSecurityIncidentReport.IRequest:
 *
 *    - From/to: recent ISO-8601 UTC range (from < to).
 *    - Page: 1; limit: small positive int32 (e.g., 10).
 *    - OrderBy: "occurredAt"; orderDirection: "desc".
 *    - Leave other filters (categories, severities, principalIds, etc.) undefined to
 *         exercise defaults.
 * 3. Call PATCH /shoppingMall/platformAdmin/reports/logging/securityIncidents.
 * 4. Assert response shape with typia.assert and inspect business semantics:
 *
 *    - Pagination.current, limit, records, pages are non-negative and structurally
 *         valid.
 *    - When records === 0, pages should be 0.
 *    - Data is an array of IShoppingMallSecurityIncidentSummary.
 * 5. If data is non-empty:
 *
 *    - All items have occurredAt within [from, to) window.
 *    - Items are ordered by occurredAt descending.
 * 6. Call the same report again with identical request body and verify
 *    idempotency: pagination and data deep-equal the first response.
 */
export async function test_api_platform_admin_security_incident_report_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (dependency auth.platformAdmin.join)
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a minimal but valid security incident report request body
  const now = new Date();
  const to = new Date(now.getTime()).toISOString();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const requestBody = {
    from,
    to,
    page: 1,
    limit: 10,
    orderBy: "occurredAt",
    orderDirection: "desc",
  } satisfies IShoppingMallSecurityIncidentReport.IRequest;

  // 3. Call the security incident report endpoint
  const first =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallSecurityIncidentReport>(first);

  const pagination: IPage.IPagination = first.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.predicate(
      "no pages when no records",
      () => pagination.pages === 0,
    );
  }

  const firstData: IShoppingMallSecurityIncidentSummary[] = first.data;
  typia.assert<IShoppingMallSecurityIncidentSummary[]>(firstData);

  // 4. When data exists, validate window and ordering
  if (firstData.length > 0) {
    const fromTime = Date.parse(from);
    const toTime = Date.parse(to);

    for (let i = 0; i < firstData.length; ++i) {
      const incident = firstData[i];
      const occurredTime = Date.parse(incident.occurredAt);

      TestValidator.predicate(
        `incident ${i} occurredAt within requested window`,
        () => occurredTime >= fromTime && occurredTime < toTime,
      );

      if (i > 0) {
        const prevOccurredTime = Date.parse(firstData[i - 1].occurredAt);
        TestValidator.predicate(
          `incident list ordered by occurredAt desc at index ${i}`,
          () => prevOccurredTime >= occurredTime,
        );
      }
    }
  }

  // 5. Idempotency: same query should return same result
  const second =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IShoppingMallSecurityIncidentReport>(second);

  TestValidator.equals(
    "idempotent pagination metadata for identical request",
    second.pagination,
    first.pagination,
  );
  TestValidator.equals(
    "idempotent data for identical request",
    second.data,
    first.data,
  );
}
