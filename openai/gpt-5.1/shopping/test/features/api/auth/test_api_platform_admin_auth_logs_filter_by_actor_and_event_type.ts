import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_auth_logs_filter_by_actor_and_event_type(
  connection: api.IConnection,
) {
  // 1. Register a platform admin A via /auth/platformAdmin/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword!123";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate platform admin login events: one success and one failure.
  // Successful admin login
  const adminLoginSuccessBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginSuccess: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginSuccessBody,
    });
  typia.assert(adminLoginSuccess);

  // Failed admin login attempt (wrong password) - should produce login.failure
  await TestValidator.error(
    "platform admin login with wrong password should fail",
    async () => {
      const badAdminLoginBody = {
        email: adminEmail,
        password: adminPassword + "wrong",
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IShoppingMallPlatformAdminLogin.IRequest;

      await api.functional.auth.platformAdmin.login(connection, {
        body: badAdminLoginBody,
      });
    },
  );

  // 3. As platform admin A, create a customer via /auth/customer/join
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = "CustomerPassword!123";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Generate customer login events: one success and one failure.
  // Successful customer login
  const customerLoginSuccessBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "Mozilla/5.0 (E2E Test)",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginSuccess: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginSuccessBody,
    });
  typia.assert(customerLoginSuccess);

  // Failed customer login attempt
  await TestValidator.error(
    "customer login with wrong password should fail",
    async () => {
      const badCustomerLoginBody = {
        email: customerEmail,
        password: customerPassword + "wrong",
        ip: null,
        href: "https://shop.example.com/login",
        referrer: "https://shop.example.com/",
        userAgent: "Mozilla/5.0 (E2E Test)",
      } satisfies IShoppingMallCustomerAuth.ILogin;

      await api.functional.auth.customer.login(connection, {
        body: badCustomerLoginBody,
      });
    },
  );

  // Helper to assert basic structure of auth log page
  const assertAuthLogPage = (
    title: string,
    page: IPageIShoppingMallAuthLog.ISummary,
  ): void => {
    typia.assert<IPageIShoppingMallAuthLog.ISummary>(page);
    TestValidator.predicate(
      `${title} - pagination records non-negative`,
      page.pagination.records >= 0,
    );
  };

  // 5. Filter logs for customer login.success
  const customerSuccessFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
    actor_type: "customer",
    actor_id: null,
    event_types: ["login.success"],
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const customerSuccessPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: customerSuccessFilterBody,
    });
  assertAuthLogPage("customer login.success filter", customerSuccessPage);

  for (const log of customerSuccessPage.data) {
    typia.assert<IShoppingMallAuthLog.ISummary>(log);
    TestValidator.equals(
      "customer login.success filter - actorType must be customer",
      log.actorType,
      "customer",
    );
    TestValidator.equals(
      "customer login.success filter - eventType must be login.success",
      log.eventType,
      "login.success",
    );
    TestValidator.equals(
      "customer login.success filter - status must be success",
      log.status,
      "success",
    );
  }

  // 6. Filter logs for customer login.failure
  const customerFailureFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
    actor_type: "customer",
    actor_id: null,
    event_types: ["login.failure"],
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const customerFailurePage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: customerFailureFilterBody,
    });
  assertAuthLogPage("customer login.failure filter", customerFailurePage);

  for (const log of customerFailurePage.data) {
    typia.assert<IShoppingMallAuthLog.ISummary>(log);
    TestValidator.equals(
      "customer login.failure filter - actorType must be customer",
      log.actorType,
      "customer",
    );
    TestValidator.equals(
      "customer login.failure filter - eventType must be login.failure",
      log.eventType,
      "login.failure",
    );
    TestValidator.equals(
      "customer login.failure filter - status must be failure",
      log.status,
      "failure",
    );
  }

  // 7. Filter logs for platformAdmin actor type, for login.success and login.failure
  const adminFilterBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_by: null,
    sort_direction: null,
    actor_type: "platformAdmin",
    actor_id: null,
    event_types: ["login.success", "login.failure"],
    success: null,
    failure_reasons: undefined,
    ip: null,
    user_agent: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallAuthLog.IRequest;

  const adminPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.authLogs.index(connection, {
      body: adminFilterBody,
    });
  assertAuthLogPage("platformAdmin login.* filter", adminPage);

  for (const log of adminPage.data) {
    typia.assert<IShoppingMallAuthLog.ISummary>(log);
    TestValidator.equals(
      "platformAdmin filter - actorType must be platformAdmin",
      log.actorType,
      "platformAdmin",
    );
    TestValidator.predicate(
      "platformAdmin filter - eventType must be login.success or login.failure",
      log.eventType === "login.success" || log.eventType === "login.failure",
    );
  }
}
