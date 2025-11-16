import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallIntegrationEventLog";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallIntegrationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallIntegrationEventLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_integration_event_logs_empty_result_and_boundary_pagination(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authorized session
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Optionally generate some integration events using customer auth flows
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.local/signup",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // Trigger password reset request to generate more potential integration events
  const passwordResetBody = {
    email: customerEmail,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: passwordResetBody,
      },
    );
  typia.assert(resetResult);

  // At this point, the last call may have changed the connection's Authorization
  // header to a customer context. Re-authenticate as platform admin to ensure
  // we are in the correct actor context for admin-only endpoints.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Empty-result scenario: use filters that should not match any events
  // Build a far-past time window and synthetic provider name/type and error code
  const emptySearchBody = {
    page: 5 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    from: "2000-01-01T00:00:00.000Z" as string & tags.Format<"date-time">,
    to: "2000-01-02T00:00:00.000Z" as string & tags.Format<"date-time">,
    providerTypes: ["__e2e_non_existing_provider_type__"],
    providerNames: ["__e2e_non_existing_provider_name__"],
    eventTypes: ["__e2e_non_existing_event_type__"],
    errorCodes: ["__e2e_non_existing_error_code__"],
  } satisfies IShoppingMallIntegrationEventLog.IRequest;

  const emptyPage: IPageIShoppingMallIntegrationEventLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
      connection,
      {
        body: emptySearchBody,
      },
    );
  typia.assert(emptyPage);

  const emptyPagination = emptyPage.pagination;
  const emptyData = emptyPage.data;

  // Validate empty-result pagination invariants
  TestValidator.equals(
    "empty-result records should be 0",
    emptyPagination.records,
    0,
  );
  TestValidator.equals(
    "empty-result pages should be 0",
    emptyPagination.pages,
    0,
  );
  TestValidator.equals(
    "empty-result current page should be 0",
    emptyPagination.current,
    0,
  );
  TestValidator.equals(
    "empty-result data should be empty array",
    emptyData.length,
    0,
  );

  // 4. Boundary first-page scenario with non-restrictive filters
  const boundarySearchBody = {
    // omit page to let backend default to its first page behaviour
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallIntegrationEventLog.IRequest;

  const boundaryPage: IPageIShoppingMallIntegrationEventLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
      connection,
      {
        body: boundarySearchBody,
      },
    );
  typia.assert(boundaryPage);

  const boundaryPagination = boundaryPage.pagination;
  const boundaryData = boundaryPage.data;

  // Basic invariants on pagination values
  TestValidator.predicate(
    "boundary records should be non-negative",
    boundaryPagination.records >= 0,
  );
  TestValidator.predicate(
    "boundary pages should be non-negative",
    boundaryPagination.pages >= 0,
  );
  TestValidator.predicate(
    "boundary current page should be non-negative",
    boundaryPagination.current >= 0,
  );

  if (boundaryPagination.records === 0) {
    // When there are no records, pages and current must both be 0
    TestValidator.equals(
      "no-records pages should be 0",
      boundaryPagination.pages,
      0,
    );
    TestValidator.equals(
      "no-records current should be 0",
      boundaryPagination.current,
      0,
    );
    TestValidator.equals(
      "no-records data should be empty",
      boundaryData.length,
      0,
    );
  } else {
    // When records exist, pages must be at least 1 and current must be < pages
    TestValidator.predicate(
      "records>0 implies pages>=1",
      boundaryPagination.pages >= 1,
    );
    TestValidator.predicate(
      "current index must be within [0, pages-1] when records>0",
      boundaryPagination.current >= 0 &&
        boundaryPagination.current < boundaryPagination.pages,
    );

    // Data length must not exceed limit and should be >0 on a valid page
    TestValidator.predicate(
      "boundary data length must be <= limit",
      boundaryData.length <= boundaryPagination.limit,
    );
    TestValidator.predicate(
      "boundary data length should be >0 when records>0",
      boundaryData.length > 0,
    );

    // Spot-check type of one summary item when data exists
    const firstSummary = boundaryData[0];
    typia.assert<IShoppingMallIntegrationEventLog.ISummary>(firstSummary);
  }
}
