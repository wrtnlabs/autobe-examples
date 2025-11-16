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

export async function test_api_platform_admin_performance_incident_report_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Prepare a reusable, syntactically valid search request body
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  const from = new Date(now.getTime() - oneHourMs).toISOString();
  const to = now.toISOString();

  const requestBody = {
    from,
    to,
    // Use a small page and limit for efficiency
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    // Leave the rest of filters undefined to allow broad search
  } satisfies IShoppingMallLoggingPerformanceIncident.IRequest;

  // 2. Build an unauthenticated connection by cloning without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Unauthenticated call must fail with some HTTP error
  await TestValidator.httpError(
    "unauthenticated performance incident search must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );

  // 4. Register a new platform admin; this will set Authorization on `connection`
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  TestValidator.predicate(
    "platform admin account created should be active",
    admin.isActive === true,
  );

  // 5. Authenticated call must succeed and return a valid paginated summary
  const page =
    await api.functional.shoppingMall.platformAdmin.reports.logging.performanceIncidents.index(
      connection,
      { body: requestBody },
    );

  typia.assert<IPageIShoppingMallLoggingPerformanceIncident.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current page must be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    pagination.pages >= 0,
  );

  // If there are no records, pages should be 0
  if (pagination.records === 0) {
    TestValidator.equals(
      "when there are no records, pages must be 0",
      pagination.pages,
      0,
    );
    TestValidator.equals(
      "when there are no records, data length must be 0",
      page.data.length,
      0,
    );
  } else {
    // Otherwise, ensure data length does not exceed limit and at least 1 page
    TestValidator.predicate(
      "when there are records, pages must be at least 1",
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      "data length must not exceed pagination limit",
      page.data.length <= pagination.limit,
    );
  }
}
