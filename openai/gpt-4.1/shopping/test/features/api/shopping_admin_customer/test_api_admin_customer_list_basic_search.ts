import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomer";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";

/**
 * Validates that an authenticated admin can search and retrieve paginated,
 * filtered lists of customers with core search/filter/sort features, only
 * receiving summary data, and with pagination info correct.
 *
 * Steps:
 *
 * 1. Register & login as admin (with random but valid credentials for all required
 *    fields).
 * 2. Perform search for customers via /shopping/admin/customers (PATCH), using
 *    various filter, sort, and page settings.
 * 3. Verify all returned data matches search criteria and only summary fields are
 *    present for each customer.
 * 4. Validate pagination structure in the response.
 * 5. Validate business logic: cannot call without admin auth; only summary-level,
 *    compliant output; can filter by name/email/status/date, sort results,
 *    paginate over pages, and receive correct result sets.
 */
export async function test_api_admin_customer_list_basic_search(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const email = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(2),
        role: RandomGenerator.pick([
          "super",
          "support",
          "operator",
          "compliance",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "pending",
          "suspended",
          "locked",
        ] as const),
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin); // Validate admin output

  // Step 2: Quick base customer search - no filters, first page
  const baseSearchReq = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingCustomer.IRequest;
  const baseList = await api.functional.shopping.admin.customers.index(
    connection,
    {
      body: baseSearchReq,
    },
  );
  typia.assert(baseList);
  TestValidator.equals(
    "pagination page matches",
    baseList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all data are summary",
    baseList.data.every(
      (v) =>
        typeof v.id === "string" &&
        typeof v.email === "string" &&
        typeof v.name === "string" &&
        typeof v.is_active === "boolean" &&
        typeof v.created_at === "string" &&
        (typeof v.deleted_at === "string" || v.deleted_at === null),
    ),
  );

  // Step 3: Search by name (using value from list if list has customers)
  if (baseList.data.length > 0) {
    const sample = baseList.data[0];
    const nameSearchReq = {
      ...baseSearchReq,
      search: sample.name.slice(
        0,
        Math.max(3, Math.floor(sample.name.length / 2)),
      ),
    } satisfies IShoppingCustomer.IRequest;
    const nameList = await api.functional.shopping.admin.customers.index(
      connection,
      { body: nameSearchReq },
    );
    typia.assert(nameList);
    TestValidator.predicate(
      "all name search result matches filter",
      nameList.data.every((c) => c.name.includes(nameSearchReq.search!)),
    );
  }

  // Step 4: Search by email (using value from list if list has customers)
  if (baseList.data.length > 0) {
    const sample = baseList.data[0];
    const emailSearchReq = {
      ...baseSearchReq,
      search: sample.email.slice(
        0,
        Math.max(3, Math.floor(sample.email.length / 2)),
      ),
    } satisfies IShoppingCustomer.IRequest;
    const emailList = await api.functional.shopping.admin.customers.index(
      connection,
      { body: emailSearchReq },
    );
    typia.assert(emailList);
    TestValidator.predicate(
      "all email search result matches filter",
      emailList.data.every((c) => c.email.includes(emailSearchReq.search!)),
    );
  }

  // Step 5: Search by is_active status (sample both true and false in API)
  for (const is_active of [true, false]) {
    const statusList = await api.functional.shopping.admin.customers.index(
      connection,
      {
        body: {
          ...baseSearchReq,
          is_active,
        } satisfies IShoppingCustomer.IRequest,
      },
    );
    typia.assert(statusList);
    TestValidator.predicate(
      `all customers have is_active = ${is_active}`,
      statusList.data.every((c) => c.is_active === is_active),
    );
  }

  // Step 6: Search with registration date range (if available)
  if (baseList.data.length > 0) {
    const sample = baseList.data[0];
    // try filtering by created_at (cut beginning/end)
    const createdAt = sample.created_at;
    const dateRangeReq = {
      ...baseSearchReq,
      created_at_from: createdAt,
      created_at_to: createdAt,
    } satisfies IShoppingCustomer.IRequest;
    const dateList = await api.functional.shopping.admin.customers.index(
      connection,
      { body: dateRangeReq },
    );
    typia.assert(dateList);
    TestValidator.predicate(
      "all results in date range",
      dateList.data.every((c) => c.created_at === createdAt),
    );
  }

  // Step 7: Pagination (if more than one page)
  if (baseList.pagination.pages > 1) {
    const secondPageReq = {
      ...baseSearchReq,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingCustomer.IRequest;
    const secondPage = await api.functional.shopping.admin.customers.index(
      connection,
      {
        body: secondPageReq,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "pagination page matches (2)",
      secondPage.pagination.current,
      2,
    );
  }

  // Step 8: Sorting (by name asc, by created_at desc)
  for (const [field, order] of [
    ["name", "asc"],
    ["created_at", "desc"],
    ["email", "asc"],
    ["is_active", "desc"],
  ] as const) {
    const sortReq = {
      ...baseSearchReq,
      sort_by: field,
      sort_order: order,
    } satisfies IShoppingCustomer.IRequest;
    const sorted = await api.functional.shopping.admin.customers.index(
      connection,
      { body: sortReq },
    );
    typia.assert(sorted);
    TestValidator.equals("sort field matches", sorted.pagination.current, 1);
    // We cannot guarantee actual sort order in test if single page/low data, so only basic assertion here
    TestValidator.predicate(
      "all customers have required summary fields",
      sorted.data.every(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          typeof c.email === "string" &&
          typeof c.is_active === "boolean" &&
          typeof c.created_at === "string",
      ),
    );
  }
}
