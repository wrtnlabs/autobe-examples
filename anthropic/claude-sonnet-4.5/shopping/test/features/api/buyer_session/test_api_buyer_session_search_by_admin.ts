import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

export async function test_api_buyer_session_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 3: Buyer logs in to create session records
  const loginData = {
    email: buyerEmail,
    password: buyerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ILogin;

  const buyerSession = await api.functional.auth.buyer.login(connection, {
    body: loginData,
  });
  typia.assert(buyerSession);

  // Step 4: Admin searches buyer sessions with pagination
  const searchRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    order: "desc" as const,
  } satisfies IShoppingMallBuyerSession.IRequest;

  const sessionPage =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: searchRequest,
    });
  typia.assert(sessionPage);

  // Step 5: Validate pagination structure
  TestValidator.equals(
    "pagination current page should be 1",
    sessionPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be set",
    sessionPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    sessionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    sessionPage.pagination.pages >= 0,
  );

  // Step 6: Validate session data structure
  TestValidator.predicate(
    "session data array should exist",
    Array.isArray(sessionPage.data),
  );

  if (sessionPage.data.length > 0) {
    const firstSession = sessionPage.data[0];
    typia.assert(firstSession);

    TestValidator.predicate(
      "session should have id",
      typeof firstSession.id === "string" && firstSession.id.length > 0,
    );
    TestValidator.equals(
      "session should belong to the correct buyer",
      firstSession.shopping_mall_buyer_id,
      buyer.id,
    );
    TestValidator.predicate(
      "session should have ip",
      typeof firstSession.ip === "string",
    );
    TestValidator.predicate(
      "session should have href",
      typeof firstSession.href === "string",
    );
    TestValidator.predicate(
      "session should have referrer",
      typeof firstSession.referrer === "string",
    );
    TestValidator.predicate(
      "session should have created_at",
      typeof firstSession.created_at === "string",
    );
  }

  // Step 7: Test filtering by active status
  const activeFilterRequest = {
    page: 1,
    limit: 10,
    is_active: true,
  } satisfies IShoppingMallBuyerSession.IRequest;

  const activeSessionsPage =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: activeFilterRequest,
    });
  typia.assert(activeSessionsPage);

  TestValidator.predicate(
    "active sessions filter should return data",
    Array.isArray(activeSessionsPage.data),
  );

  // Step 8: Test sorting in ascending order
  const ascendingRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at" as const,
    order: "asc" as const,
  } satisfies IShoppingMallBuyerSession.IRequest;

  const ascendingPage =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: ascendingRequest,
    });
  typia.assert(ascendingPage);

  TestValidator.predicate(
    "ascending sort should return valid data",
    Array.isArray(ascendingPage.data),
  );

  // Step 9: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dateFilterRequest = {
    page: 1,
    limit: 10,
    created_after: yesterday.toISOString(),
    created_before: tomorrow.toISOString(),
  } satisfies IShoppingMallBuyerSession.IRequest;

  const dateFilteredPage =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: dateFilterRequest,
    });
  typia.assert(dateFilteredPage);

  TestValidator.predicate(
    "date range filter should return valid data",
    Array.isArray(dateFilteredPage.data),
  );
}
