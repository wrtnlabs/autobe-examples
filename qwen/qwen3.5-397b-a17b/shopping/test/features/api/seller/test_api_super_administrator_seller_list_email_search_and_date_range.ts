import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test seller list search functionality including email partial match,
 * creation date range filtering, and sorting options for super administrator.
 *
 * Test Strategy:
 * 1. Create super administrator account and authenticate
 * 2. Create multiple seller accounts with distinct email patterns and track their creation times
 * 3. Submit approval requests for all sellers to ensure they appear in the list
 * 4. Test email partial match search (case-insensitive LIKE query)
 * 5. Test date range filtering with created_at_from and created_at_to parameters
 * 6. Test all sorting options (created_at_DESC, email_ASC, email_DESC)
 * 7. Test pagination with active filters
 * 8. Test combined filters (search + status + date range + sort)
 * 9. Validate pagination metadata reflects filtered results accurately
 *
 * Key Validations:
 * - Email search returns only sellers with matching substring
 * - Date range uses inclusive boundaries (>= and <=)
 * - Sorting applied after filtering
 * - Pagination calculates correct total pages based on filtered count
 * - All filter combinations work together
 */
export async function test_api_super_administrator_seller_list_email_search_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: "TestPass123!",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/",
      },
    },
  );
  typia.assert(superAdmin);
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminEmail,
      password: "TestPass123!",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/",
    },
  });
  // 2. Create multiple seller accounts with distinct email patterns
  const sellerEmails = [
    "test.alpha@example.com",
    "test.beta@example.com",
    "test.gamma@example.com",
    "demo.alpha@example.com",
    "demo.beta@example.com",
  ];
  const sellerConnections: api.IConnection[] = [];
  const sellerIds: string[] = [];
  for (const email of sellerEmails) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: email,
        password: "SellerPass123!",
        href: "https://test.com/seller/join",
        referrer: "https://test.com/",
      },
    });
    typia.assert(seller);
    sellerConnections.push(sellerConnection);
    sellerIds.push(seller.id);
  }
  // 3. Submit approval requests for all sellers
  for (const sellerConnection of sellerConnections) {
    const approvalRequest =
      await generate_random_shopping_mall_seller_approval_requests_create(
        sellerConnection,
        {},
      );
    typia.assert(approvalRequest);
  }
  // Small delay to ensure different creation timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test email partial match search - "test." prefix
  const testPrefixResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "test.",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(testPrefixResults);
  TestValidator.equals(
    "test. prefix search count",
    testPrefixResults.data.length,
    3,
  );
  TestValidator.predicate(
    "all results contain test. in email",
    testPrefixResults.data.every((s) => s.email.includes("test.")),
  );
  // 5. Test email partial match search - "demo." prefix
  const demoPrefixResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "demo.",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(demoPrefixResults);
  TestValidator.equals(
    "demo. prefix search count",
    demoPrefixResults.data.length,
    2,
  );
  TestValidator.predicate(
    "all results contain demo. in email",
    demoPrefixResults.data.every((s) => s.email.includes("demo.")),
  );
  // 6. Test case-insensitive search
  const uppercaseResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "TEST.",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(uppercaseResults);
  TestValidator.equals(
    "case-insensitive search count",
    uppercaseResults.data.length,
    3,
  );
  // 7. Test date range filtering - get all sellers first for reference
  const allSellers =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(allSellers);
  // Get creation timestamps for date range testing
  const createdDates = allSellers.data.map((s) => new Date(s.created_at));
  const minDate = new Date(Math.min(...createdDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...createdDates.map((d) => d.getTime())));
  // Test created_at_from filter
  const fromDateResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          created_at_from: minDate.toISOString(),
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(fromDateResults);
  TestValidator.predicate(
    "from date filter - all results >= minDate",
    fromDateResults.data.every(
      (s) => new Date(s.created_at).getTime() >= minDate.getTime(),
    ),
  );
  // Test created_at_to filter
  const toDateResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          created_at_to: maxDate.toISOString(),
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(toDateResults);
  TestValidator.predicate(
    "to date filter - all results <= maxDate",
    toDateResults.data.every(
      (s) => new Date(s.created_at).getTime() <= maxDate.getTime(),
    ),
  );
  // Test combined date range
  const dateRangeResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          created_at_from: minDate.toISOString(),
          created_at_to: maxDate.toISOString(),
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filter - all results within range",
    dateRangeResults.data.every(
      (s) =>
        new Date(s.created_at).getTime() >= minDate.getTime() &&
        new Date(s.created_at).getTime() <= maxDate.getTime(),
    ),
  );
  // 8. Test sorting options
  // Test created_at_DESC (default, newest first)
  const createdAtDescResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          sort: "created_at_DESC",
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(createdAtDescResults);
  for (let i = 1; i < createdAtDescResults.data.length; i++) {
    TestValidator.predicate(
      `created_at_DESC order at index ${i}`,
      new Date(createdAtDescResults.data[i - 1].created_at).getTime() >=
        new Date(createdAtDescResults.data[i].created_at).getTime(),
    );
  }
  // Test email_ASC (alphabetical A-Z)
  const emailAscResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          sort: "email_ASC",
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emailAscResults);
  for (let i = 1; i < emailAscResults.data.length; i++) {
    TestValidator.predicate(
      `email_ASC order at index ${i}`,
      emailAscResults.data[i - 1].email.localeCompare(
        emailAscResults.data[i].email,
      ) <= 0,
    );
  }
  // Test email_DESC (alphabetical Z-A)
  const emailDescResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          sort: "email_DESC",
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(emailDescResults);
  for (let i = 1; i < emailDescResults.data.length; i++) {
    TestValidator.predicate(
      `email_DESC order at index ${i}`,
      emailDescResults.data[i - 1].email.localeCompare(
        emailDescResults.data[i].email,
      ) >= 0,
    );
  }
  // 9. Test combined filters (search + date range + sort)
  const combinedResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "test.",
          created_at_from: minDate.toISOString(),
          created_at_to: maxDate.toISOString(),
          sort: "email_ASC",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals("combined filter count", combinedResults.data.length, 3);
  TestValidator.predicate(
    "combined filter - all contain test.",
    combinedResults.data.every((s) => s.email.includes("test.")),
  );
  TestValidator.predicate(
    "combined filter - sorted by email ASC",
    combinedResults.data.every(
      (s, i) =>
        i === 0 ||
        combinedResults.data[i - 1].email.localeCompare(s.email) <= 0,
    ),
  );
  // 10. Test pagination with filters
  const paginatedResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "example",
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination - page 1 has max 2 items",
    paginatedResults.data.length <= 2,
  );
  TestValidator.equals(
    "pagination - current page is 1",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - limit is 2",
    paginatedResults.pagination.limit,
    2,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination - pages calculated correctly",
    paginatedResults.pagination.pages ===
      Math.ceil(
        paginatedResults.pagination.records / paginatedResults.pagination.limit,
      ),
  );
  // Test page 2
  const page2Results =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          search: "example",
          page: 2,
          limit: 2,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(page2Results);
  TestValidator.equals(
    "pagination - page 2 current",
    page2Results.pagination.current,
    2,
  );
  // 11. Test approval status filter
  const pendingResults =
    await api.functional.shoppingMall.superAdministrator.sellers.index(
      superAdminLoginConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(pendingResults);
  TestValidator.predicate(
    "pending status filter - all have pending status",
    pendingResults.data.every((s) => s.approval_status === "pending"),
  );
}
