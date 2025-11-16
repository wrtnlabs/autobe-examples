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

export async function test_api_platform_admin_security_incident_report_empty_result_handling(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and establish authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a request body that should yield no security incidents
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() + 10);
  const toDate = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);

  const emptyFilterRequest = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    principalIds: [typia.random<string & tags.Format<"uuid">>()],
    ipAddresses: [
      "203.0.113.254", // TEST-NET-3 address used in documentation examples
    ],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSecurityIncidentReport.IRequest;

  // 3. Call the security incident report endpoint
  const report: IShoppingMallSecurityIncidentReport =
    await api.functional.shoppingMall.platformAdmin.reports.logging.securityIncidents.index(
      connection,
      {
        body: emptyFilterRequest,
      },
    );

  // Validate structural type of the response
  typia.assert<IShoppingMallSecurityIncidentReport>(report);
  typia.assert<IPage.IPagination>(report.pagination);

  // 4. Business-level assertions for the empty-result behavior
  TestValidator.equals(
    "security incident report should have zero records for empty range",
    report.pagination.records,
    0,
  );

  TestValidator.equals(
    "security incident report should have zero pages for empty range",
    report.pagination.pages,
    0,
  );

  TestValidator.equals(
    "security incident report current page index should be 0 when no records",
    report.pagination.current,
    0,
  );

  TestValidator.equals(
    "security incident report data array should be empty when no incidents",
    report.data.length,
    0,
  );

  TestValidator.predicate(
    "pagination limit should be positive even when there are no records",
    report.pagination.limit > 0,
  );
}
