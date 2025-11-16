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

export async function test_api_platform_admin_integration_event_logs_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authorized session
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      email: adminEmail,
      name: RandomGenerator.name(),
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminJoin.IRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminJoin);

  // connection.headers.Authorization is now set by SDK for the admin

  // 2. Create a customer account that we will use to trigger integration events
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  // 3. Capture a time window start slightly before triggering events
  const windowStartDate = new Date();
  const windowStartIso = windowStartDate.toISOString();

  // 4. Trigger integration events related to the customer
  // 4-1. Password reset request (should create integration event(s))
  const passwordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: customerEmail,
        } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    passwordResetResult,
  );

  // Also log in the customer once, which may generate additional integration logs
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/signin",
      userAgent: "e2e-test-agent",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 5. Capture window end slightly after events
  const windowEndDate = new Date();
  const windowEndIso = windowEndDate.toISOString();

  // 6. As platformAdmin, search integration event logs with basic filters
  // Ensure we are authenticated as platform admin (login again explicitly)
  const adminLogin = await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminLogin);

  const searchRequest = {
    page: 1,
    limit: 20,
    from: windowStartIso,
    to: windowEndIso,
    providerTypes: ["email"],
    statuses: ["success"],
  } satisfies IShoppingMallIntegrationEventLog.IRequest;

  const page =
    await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallIntegrationEventLog.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // 7. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  // 8. When there is at least one record, validate key fields of a summary
  if (data.length > 0) {
    const first: IShoppingMallIntegrationEventLog.ISummary = data[0];

    TestValidator.predicate(
      "summary id should be non-empty",
      first.id.length > 0,
    );
    TestValidator.predicate(
      "summary provider_type should be non-empty",
      first.provider_type.length > 0,
    );
    TestValidator.predicate(
      "summary event_type should be non-empty",
      first.event_type.length > 0,
    );
    TestValidator.predicate(
      "summary direction should be non-empty",
      first.direction.length > 0,
    );
    TestValidator.predicate(
      "summary status should be non-empty",
      first.status.length > 0,
    );

    // status must match one of requested statuses ("success")
    TestValidator.predicate(
      "summary status must be one of requested statuses",
      searchRequest.statuses !== undefined &&
        searchRequest.statuses.includes(first.status),
    );

    // created_at must lie within [from, to]
    const createdAt = new Date(first.created_at).getTime();
    const fromTime = new Date(searchRequest.from ?? windowStartIso).getTime();
    const toTime = new Date(searchRequest.to ?? windowEndIso).getTime();
    TestValidator.predicate(
      "summary created_at within requested window",
      createdAt >= fromTime && createdAt <= toTime,
    );

    // 9. Additional verification with narrower time window around this event
    const narrowFromIso = first.created_at;
    const narrowToIso = first.created_at;
    const narrowRequest = {
      page: 1,
      limit: 20,
      from: narrowFromIso,
      to: narrowToIso,
      providerTypes: searchRequest.providerTypes,
      statuses: searchRequest.statuses,
    } satisfies IShoppingMallIntegrationEventLog.IRequest;

    const narrowPage =
      await api.functional.shoppingMall.platformAdmin.integrationEventLogs.index(
        connection,
        {
          body: narrowRequest,
        },
      );
    typia.assert<IPageIShoppingMallIntegrationEventLog.ISummary>(narrowPage);

    const narrowData = narrowPage.data;
    for (const item of narrowData) {
      const ts = new Date(item.created_at).getTime();
      const nf = new Date(narrowRequest.from ?? narrowFromIso).getTime();
      const nt = new Date(narrowRequest.to ?? narrowToIso).getTime();
      TestValidator.predicate(
        "narrow window results created_at within range",
        ts >= nf && ts <= nt,
      );
      TestValidator.predicate(
        "narrow window result status matches filter",
        narrowRequest.statuses !== undefined &&
          narrowRequest.statuses.includes(item.status),
      );
    }
  }
}
