import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create multiple sellers (>= 6) via seller join
  const sellerCount = 6;
  const createdSellerEmails: string[] = [];

  for (let i = 0; i < sellerCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const joinBody = {
      email,
      password: typia.random<string & tags.Format<"password">>(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSellerAuthJoin.IRequest;

    const sellerAuthorized: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: joinBody,
      });
    typia.assert(sellerAuthorized);
    createdSellerEmails.push(email);
  }

  // 2-1. Re-authenticate as an admin to run the admin-only search
  const adminRejoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminReAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminReAuthorized);

  // Helper to validate sorting order
  const assertSortedByCreatedAt = (
    title: string,
    summaries: IShoppingMallSeller.ISummary[],
    direction: "asc" | "desc",
  ) => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      const prevTime = new Date(prev.createdAt).getTime();
      const currTime = new Date(curr.createdAt).getTime();

      if (direction === "asc") {
        TestValidator.predicate(
          `${title} ascending order at index ${i}`,
          prevTime <= currTime,
        );
      } else {
        TestValidator.predicate(
          `${title} descending order at index ${i}`,
          prevTime >= currTime,
        );
      }
    }
  };

  // 3. Page 1 with limit=3, orderBy created_at desc
  const page = 1;
  const limit = 3;

  const page1Response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page,
        limit,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(page1Response);

  const page1Pagination = page1Response.pagination;
  const page1Data = page1Response.data;

  // Basic pagination assertions (use plain numbers as base type for equals)
  TestValidator.equals(
    "page 1: current page should match request",
    page,
    page1Pagination.current,
  );
  TestValidator.equals(
    "page 1: limit should match request",
    limit,
    page1Pagination.limit,
  );

  TestValidator.predicate(
    "page 1: records should be at least sellerCount",
    page1Pagination.records >= sellerCount,
  );

  const expectedPages = Math.ceil(
    page1Pagination.records / page1Pagination.limit,
  );
  TestValidator.equals(
    "page 1: pages should be consistent with records and limit",
    expectedPages,
    page1Pagination.pages,
  );

  TestValidator.predicate(
    "page 1: data length should be <= limit",
    page1Data.length <= limit,
  );

  TestValidator.predicate(
    "page 1: data length should be equal to limit when sufficient records exist",
    page1Pagination.records >= limit ? page1Data.length === limit : true,
  );

  // Sorting assertions for page 1 desc
  assertSortedByCreatedAt("page 1 desc", page1Data, "desc");

  // 5. Page 2 with same limit and sorting
  const page2 = 2;
  const page2Response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: page2,
        limit,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(page2Response);

  const page2Pagination = page2Response.pagination;
  const page2Data = page2Response.data;

  TestValidator.equals(
    "page 2: current page should match request",
    page2,
    page2Pagination.current,
  );

  // Sorting assertions for page 2 desc
  assertSortedByCreatedAt("page 2 desc", page2Data, "desc");

  // Verify no duplicate IDs between page 1 and page 2
  const page1Ids = new Set(page1Data.map((s) => s.id));
  const page2Ids = new Set(page2Data.map((s) => s.id));

  let hasOverlap = false;
  for (const id of page2Ids) {
    if (page1Ids.has(id)) {
      hasOverlap = true;
      break;
    }
  }
  TestValidator.predicate(
    "page 1 and page 2 should not have overlapping seller IDs when enough records",
    page1Pagination.records > limit ? hasOverlap === false : true,
  );

  // 6. If there are more than 2 pages, validate last page behavior
  if (page1Pagination.pages > 2) {
    const lastPage = page1Pagination.pages;
    const lastPageResponse: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          page: lastPage,
          limit,
          orderBy: "created_at",
          orderDirection: "desc",
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(lastPageResponse);

    const lastPagination = lastPageResponse.pagination;
    const lastData = lastPageResponse.data;

    TestValidator.equals(
      "last page: current should equal pages",
      lastPagination.pages,
      lastPagination.current,
    );

    TestValidator.predicate(
      "last page: data length should be > 0",
      lastData.length > 0,
    );

    TestValidator.predicate(
      "last page: data length should be <= limit",
      lastData.length <= limit,
    );

    assertSortedByCreatedAt("last page desc", lastData, "desc");
  }

  // 7. Ascending order test (page 1)
  const ascPage1Response: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit,
        orderBy: "created_at",
        orderDirection: "asc",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(ascPage1Response);

  const ascPage1Data = ascPage1Response.data;
  assertSortedByCreatedAt("page 1 asc", ascPage1Data, "asc");

  // Basic consistency check between asc and desc for first/last elements
  if (page1Data.length > 0 && ascPage1Data.length > 0) {
    const descFirst = page1Data[0];
    const ascLast = ascPage1Data[ascPage1Data.length - 1];

    TestValidator.predicate(
      "desc first should be as new or newer than asc last by createdAt",
      new Date(descFirst.createdAt).getTime() >=
        new Date(ascLast.createdAt).getTime(),
    );
  }

  // 8. Optional search filter test using a substring of a known seller email
  const sampleEmail = createdSellerEmails[0];
  const emailSearchSubstring = sampleEmail.split("@")[0].slice(0, 3);

  const searchResponse: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit,
        search: emailSearchSubstring,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(searchResponse);

  const searchPagination = searchResponse.pagination;
  const searchData = searchResponse.data;

  TestValidator.predicate(
    "search: data length should be <= limit",
    searchData.length <= limit,
  );

  // Do not over-constrain search semantics; just ensure at least one match
  if (searchData.length > 0) {
    const hasEmailContainingSubstring = searchData.some((summary) =>
      summary.email.toLowerCase().includes(emailSearchSubstring.toLowerCase()),
    );
    TestValidator.predicate(
      "search: at least one seller email should contain the search substring (case-insensitive)",
      hasEmailContainingSubstring,
    );
  }

  // Pagination metadata should still be internally consistent
  const expectedSearchPages = Math.ceil(
    searchPagination.records / searchPagination.limit,
  );
  TestValidator.equals(
    "search: pages should be consistent with records and limit",
    expectedSearchPages,
    searchPagination.pages,
  );
}
