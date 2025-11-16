import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin customer search with basic filters and pagination.
 *
 * Business goals:
 *
 * - Ensure a platform administrator can search customers with pagination through
 *   PATCH /shoppingMall/platformAdmin/customers.
 * - Verify basic filters (email, is_verified, generic search/name) behave as
 *   expected for records we control.
 * - Confirm that the customer list endpoint returns summary DTOs that do not leak
 *   sensitive customer fields.
 *
 * High level workflow:
 *
 * 1. Register a platform admin using /auth/platformAdmin/join to obtain an
 *    authorized admin session.
 * 2. Create three distinct customers using /auth/customer/join.
 * 3. Call the customer search endpoint without filters (only pagination) and check
 *    that all three customers appear in the paginated results.
 * 4. Call the endpoint with an email filter to narrow down to a single customer.
 * 5. Call the endpoint with an is_verified filter (false) and confirm that at
 *    least one of the created customers is included.
 * 6. Call the endpoint with generic `search` and explicit `name` filters to
 *    validate partial and exact name matching semantics.
 * 7. Assert that the returned customer summaries expose only the allowed fields
 *    (id, display_name, avatar_url) and no sensitive attributes.
 */
export async function test_api_platform_admin_customer_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain Authorization token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
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

  // 2. Create three distinct customers using auth.customer.join.
  const customers: IShoppingMallCustomer.IAuthorized[] = [];

  const baseNamePrefix = `FilterTest ${RandomGenerator.name(1)}`;

  for (let i = 0; i < 3; i++) {
    const customerJoinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: `${baseNamePrefix} #${i + 1}`,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomerAuth.IJoin;

    const customerAuthorized = await api.functional.auth.customer.join(
      connection,
      {
        body: customerJoinBody,
      },
    );
    typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);
    customers.push(customerAuthorized);
  }

  // Helper: build a map from customer summary id to the full authorization
  // envelope to assist in filter assertions.
  const customerById = new Map<string, IShoppingMallCustomer.IAuthorized>();
  for (const customer of customers) {
    customerById.set(customer.customer.id, customer);
  }

  // 3. Basic list without filters (only pagination) - page 1, limit large.
  const basicListBody = {
    page: 1,
    limit: 50,
  } satisfies IShoppingMallCustomer.IRequest;

  const basicList =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: basicListBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(basicList);

  const pagination = basicList.pagination;
  TestValidator.predicate(
    "pagination.limit must be at least 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.records must include at least the created customers",
    pagination.records >= customers.length,
  );

  // Ensure all created customers appear in the basic list.
  const basicIds = basicList.data.map((summary) => summary.id);
  for (const customer of customers) {
    const exists = basicIds.includes(customer.customer.id);
    TestValidator.predicate(
      "basic listing must contain each newly created customer",
      exists,
    );
  }

  // 4. Email filter: exact match for one specific customer.
  const targetCustomer = customers[0];
  const emailFilterBody = {
    page: 1,
    limit: 50,
    email: targetCustomer.email,
  } satisfies IShoppingMallCustomer.IRequest;

  const emailFiltered =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: emailFilterBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(emailFiltered);

  TestValidator.predicate(
    "email filter should return at least one result",
    emailFiltered.pagination.records >= 1,
  );

  const emailFilteredIds = emailFiltered.data.map((summary) => summary.id);
  TestValidator.predicate(
    "email filter results must include the targeted customer",
    emailFilteredIds.includes(targetCustomer.customer.id),
  );

  // Optionally validate that every returned summary corresponds to a customer
  // with matching email when we have it in the local map.
  for (const summary of emailFiltered.data) {
    const local = customerById.get(summary.id);
    if (!local) continue; // might be some pre-existing customer outside our control
    TestValidator.equals(
      "email filter results must match customer email when locally known",
      local.email,
      targetCustomer.email,
    );
  }

  // 5. Filter by is_verified = false.
  const unverifiedFilterBody = {
    page: 1,
    limit: 50,
    is_verified: false,
  } satisfies IShoppingMallCustomer.IRequest;

  const unverifiedList =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: unverifiedFilterBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(unverifiedList);

  const unverifiedIds = unverifiedList.data.map((summary) => summary.id);
  // We only require that at least one of our created customers appears in the
  // is_verified=false list, to avoid assumptions about backend defaults.
  const hasAnyCreatedInUnverified = customers.some((customer) =>
    unverifiedIds.includes(customer.customer.id),
  );
  TestValidator.predicate(
    "is_verified=false filter should return at least one newly created customer when possible",
    hasAnyCreatedInUnverified,
  );

  // 6. Partial search using `search` and `name`.
  const nameForSearch = customers[1].name;
  const keyword = nameForSearch.substring(0, Math.min(5, nameForSearch.length));

  const searchBody = {
    page: 1,
    limit: 50,
    search: keyword,
  } satisfies IShoppingMallCustomer.IRequest;

  const searchResult =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: searchBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(searchResult);

  const searchIds = searchResult.data.map((summary) => summary.id);
  const hasSearchHit = customers.some((customer) => {
    if (!searchIds.includes(customer.customer.id)) return false;
    return customer.name.toLowerCase().includes(keyword.toLowerCase());
  });
  TestValidator.predicate(
    "generic search should return at least one created customer matching the keyword",
    hasSearchHit,
  );

  const nameFilterBody = {
    page: 1,
    limit: 50,
    name: nameForSearch,
  } satisfies IShoppingMallCustomer.IRequest;

  const nameFiltered =
    await api.functional.shoppingMall.platformAdmin.customers.index(
      connection,
      { body: nameFilterBody },
    );
  typia.assert<IPageIShoppingMallCustomer.ISummary>(nameFiltered);

  const nameFilteredIds = nameFiltered.data.map((summary) => summary.id);
  TestValidator.predicate(
    "name filter should include the customer whose name was used as filter",
    nameFilteredIds.includes(customers[1].customer.id),
  );

  // 7. Data minimization: ensure summary objects expose only defined fields.
  const sampleSummary = basicList.data[0] ?? undefined;
  TestValidator.predicate(
    "basic list should contain at least one customer summary for shape check",
    sampleSummary !== undefined,
  );

  if (sampleSummary) {
    typia.assert<IShoppingMallCustomer.ISummary>(sampleSummary);
    const keys = Object.keys(sampleSummary).sort();
    const allowedKeys = ["avatar_url", "display_name", "id"].sort();

    TestValidator.equals(
      "customer summary must only have id, display_name, and avatar_url keys",
      keys,
      allowedKeys,
    );
  }
}
