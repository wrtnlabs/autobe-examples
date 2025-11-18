import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

export async function test_api_admin_customer_search_filter_by_created_at_range(
  connection: api.IConnection,
) {
  /**
   * Validate that admin customer search filters by created_at range.
   *
   * Steps:
   *
   * 1. Join an admin account so we can call the admin search API.
   * 2. Create three groups of customers via customer join: early, mid, late.
   * 3. Use the admin search API to fetch all customers and locate our test
   *    customers plus their created_at timestamps.
   * 4. Build time windows using those timestamps and call the search API with
   *    created_from / created_until filters.
   * 5. For each window, verify that:
   *
   *    - All returned customers have created_at within [created_from,
   *         created_until].
   *    - Known in-window customers appear in the results.
   *    - Known out-of-window customers do not appear.
   */
  // 1. Join an admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create early, mid, late customers
  const createCustomer = async () => {
    const body = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      ip: null,
      href: "https://shop.example.com/join",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerJoin.IRequest;
    const customer = await api.functional.auth.customer.join(connection, {
      body,
    });
    typia.assert(customer);
    return customer;
  };

  const earlyCustomers: IShoppingMallCustomer.IAuthorized[] = [];
  const midCustomers: IShoppingMallCustomer.IAuthorized[] = [];
  const lateCustomers: IShoppingMallCustomer.IAuthorized[] = [];

  for (let i = 0; i < 2; i++) earlyCustomers.push(await createCustomer());
  midCustomers.push(await createCustomer());
  for (let i = 0; i < 2; i++) lateCustomers.push(await createCustomer());

  const allCreated = [...earlyCustomers, ...midCustomers, ...lateCustomers];

  // 3. Fetch all customers via admin search (large limit) and locate our test ones
  const fullSearchBody = {
    page: 1,
    limit: 1000,
  } satisfies IShoppingMallCustomer.IRequest;

  const fullPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: fullSearchBody,
    });
  typia.assert(fullPage);

  const summaries = fullPage.data;

  const findSummary = (id: string & tags.Format<"uuid">) =>
    summaries.find((s) => s.id === id);

  const earlySummary = findSummary(earlyCustomers[0].id)!;
  const midSummary = findSummary(midCustomers[0].id)!;
  const lateSummary = findSummary(lateCustomers[0].id)!;

  typia.assert(earlySummary);
  typia.assert(midSummary);
  typia.assert(lateSummary);

  // Helper to check range inclusively
  const isWithin = (value: string, from?: string, until?: string): boolean => {
    if (from !== undefined && value < from) return false;
    if (until !== undefined && value > until) return false;
    return true;
  };

  // 4-A. Wide window: [early.created_at, late.created_at] should include all three
  const wideFrom = earlySummary.created_at;
  const wideUntil = lateSummary.created_at;

  const wideBody = {
    page: 1,
    limit: 1000,
    created_from: wideFrom,
    created_until: wideUntil,
  } satisfies IShoppingMallCustomer.IRequest;

  const widePage = await api.functional.shoppingMall.admin.customers.index(
    connection,
    { body: wideBody },
  );
  typia.assert(widePage);

  for (const s of widePage.data) {
    TestValidator.predicate("wide window range check", () =>
      isWithin(s.created_at, wideFrom, wideUntil),
    );
  }

  const wideIds = new Set(widePage.data.map((s) => s.id));
  TestValidator.predicate("wide window includes early", () =>
    wideIds.has(earlySummary.id),
  );
  TestValidator.predicate("wide window includes mid", () =>
    wideIds.has(midSummary.id),
  );
  TestValidator.predicate("wide window includes late", () =>
    wideIds.has(lateSummary.id),
  );

  TestValidator.predicate(
    "wide records >= known created",
    () => widePage.pagination.records >= allCreated.length,
  );

  // 4-B. Narrow window at mid exact timestamp [mid, mid]
  const exactMidBody = {
    page: 1,
    limit: 1000,
    created_from: midSummary.created_at,
    created_until: midSummary.created_at,
  } satisfies IShoppingMallCustomer.IRequest;

  const exactMidPage = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: exactMidBody,
    },
  );
  typia.assert(exactMidPage);

  for (const s of exactMidPage.data) {
    TestValidator.predicate("exact mid window range check", () =>
      isWithin(s.created_at, midSummary.created_at, midSummary.created_at),
    );
  }

  const exactIds = new Set(exactMidPage.data.map((s) => s.id));
  TestValidator.predicate("exact mid includes mid", () =>
    exactIds.has(midSummary.id),
  );
  TestValidator.predicate(
    "exact mid excludes early",
    () => !exactIds.has(earlySummary.id),
  );
  TestValidator.predicate(
    "exact mid excludes late",
    () => !exactIds.has(lateSummary.id),
  );
}
