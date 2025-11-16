import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that a platform administrator can list authentication sessions for a
 * specific onboarded customer, and that the response is properly paginated and
 * structurally safe.
 *
 * Business flow:
 *
 * 1. Register a new platform admin via /auth/platformAdmin/join (admin becomes
 *    authenticated).
 * 2. Register a new customer via /auth/customer/join (creating at least one
 *    session).
 * 3. Log the same customer in via /auth/customer/login to create another session.
 * 4. Re-authenticate as the platform admin via /auth/platformAdmin/login.
 * 5. As platform admin, call PATCH
 *    /shoppingMall/platformAdmin/customers/{customerId}/sessions with a basic
 *    pagination request and validate:
 *
 *    - Response type is IPageIShoppingMallCustomerSession.ISummary.
 *    - Pagination.limit matches the requested limit.
 *    - Data.length is <= limit and each element is a valid
 *         IShoppingMallCustomerSession.ISummary.
 * 6. Call the same endpoint again with an `is_active` filter to ensure filtered
 *    listing still returns structurally valid paginated data.
 */
export async function test_api_customer_sessions_listing_for_verified_customer_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and becomes authenticated)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPass!123";

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedOnJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2. Customer joins (and becomes authenticated, creating at least one session)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = "CustomerPass!123";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedOnJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedOnJoin);

  const customerId = customerAuthorizedOnJoin.id;

  // 3. Customer logs in again to create at least one more session
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/home",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedOnLogin);

  // 4. Re-authenticate as platform admin (connection token will switch back to admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedOnLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 5. Platform admin lists customer sessions with basic pagination
  const pageRequest = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limitRequest = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const sessionsRequestBody = {
    page: pageRequest,
    limit: limitRequest,
    sortBy: "created_at" as const,
    sortDirection: "desc" as const,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const sessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(sessionsPage);

  const pagination = sessionsPage.pagination;
  const sessions = sessionsPage.data;

  TestValidator.equals(
    "sessions pagination limit should match requested limit",
    pagination.limit,
    limitRequest,
  );

  TestValidator.predicate(
    "sessions count should not exceed requested limit",
    sessions.length <= limitRequest,
  );

  TestValidator.predicate(
    "records should be at least the number of returned sessions",
    pagination.records >= sessions.length,
  );

  for (const s of sessions) {
    typia.assert<IShoppingMallCustomerSession.ISummary>(s);
  }

  // 6. Call sessions listing again with an is_active filter to ensure filtering works structurally
  const filteredRequestBody = {
    page: pageRequest,
    limit: limitRequest,
    sortBy: "created_at" as const,
    sortDirection: "desc" as const,
    is_active: true,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const activeSessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId,
        body: filteredRequestBody,
      },
    );
  typia.assert(activeSessionsPage);

  const activePagination = activeSessionsPage.pagination;
  const activeSessions = activeSessionsPage.data;

  TestValidator.equals(
    "active sessions pagination limit should match requested limit",
    activePagination.limit,
    limitRequest,
  );

  TestValidator.predicate(
    "active sessions count should not exceed requested limit",
    activeSessions.length <= limitRequest,
  );

  TestValidator.predicate(
    "active records should be at least the number of returned active sessions",
    activePagination.records >= activeSessions.length,
  );

  for (const s of activeSessions) {
    typia.assert<IShoppingMallCustomerSession.ISummary>(s);
  }
}
