import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_customer_wishlist_empty_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test empty wishlist scenario with fresh customer account
  const emptyWishlistConnection: api.IConnection = { host: connection.host };
  const emptyWishlistCustomer = await authorize_customer_join(
    emptyWishlistConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: typia.assert<string & tags.MinLength<8> & tags.Format<"password">>(RandomGenerator.alphaNumeric(16)),
        href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
        referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
        ip: typia.assert<string & tags.Format<"ipv4">>(typia.random<string & tags.Format<"ipv4">>()),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  // Make PATCH request immediately after registration
  const emptyWishlistResponse =
    await api.functional.ecommerceMall.customer.wishlist.index(
      emptyWishlistConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyWishlistResponse);
  TestValidator.equals(
    "empty wishlist data is empty array",
    emptyWishlistResponse.data,
    [],
  );
  TestValidator.equals(
    "empty wishlist has 0 records",
    emptyWishlistResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty wishlist has 0 pages",
    emptyWishlistResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty wishlist starts at page 1",
    emptyWishlistResponse.pagination.current,
    1,
  );
  // 2. Create customer with 15+ wishlist items for pagination testing
  const paginatedConnection: api.IConnection = { host: connection.host };
  const paginatedCustomer = await authorize_customer_join(paginatedConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: typia.assert<string & tags.MinLength<8> & tags.Format<"password">>(RandomGenerator.alphaNumeric(16)),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      ip: typia.assert<string & tags.Format<"ipv4">>(typia.random<string & tags.Format<"ipv4">>()),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Add 15 products to wishlist
  const wishlistEntries: IEcommerceMallWishlist[] = [];
  await ArrayUtil.asyncRepeat(15, async () => {
    const entry = await generate_random_ecommerce_mall_customer_wishlist_create(
      paginatedConnection,
      {},
    );
    wishlistEntries.push(entry);
  });
  TestValidator.equals("added 15 wishlist items", wishlistEntries.length, 15);
  // 3. Test pagination edge cases
  // Request with page=1, limit=10
  const page1Limit10 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 returns 10 items",
    page1Limit10.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 correct records",
    page1Limit10.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 limit 10 correct pages",
    page1Limit10.pagination.pages,
    2,
  );
  TestValidator.equals(
    "page 1 limit 10 correct current",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 correct limit",
    page1Limit10.pagination.limit,
    10,
  );
  // Request with page=999 (beyond available pages)
  const beyondLastPage =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 999, limit: 10 },
      },
    );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page returns empty data",
    beyondLastPage.data,
    [],
  );
  TestValidator.equals(
    "beyond last page has 0 records",
    beyondLastPage.pagination.records,
    15,
  );
  TestValidator.equals(
    "beyond last page has 2 pages",
    beyondLastPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "beyond last page current is 999",
    beyondLastPage.pagination.current,
    999,
  );
  // Request with limit=1 (minimum)
  const limit1 = await api.functional.ecommerceMall.customer.wishlist.index(
    paginatedConnection,
    {
      body: { page: 1, limit: 1 },
    },
  );
  typia.assert(limit1);
  TestValidator.equals("limit 1 returns 1 item", limit1.data.length, 1);
  TestValidator.equals(
    "limit 1 correct records",
    limit1.pagination.records,
    15,
  );
  TestValidator.equals("limit 1 correct pages", limit1.pagination.pages, 15);
  TestValidator.equals("limit 1 correct limit", limit1.pagination.limit, 1);
  // Request with limit=100 (maximum)
  const limit100 = await api.functional.ecommerceMall.customer.wishlist.index(
    paginatedConnection,
    {
      body: { page: 1, limit: 100 },
    },
  );
  typia.assert(limit100);
  TestValidator.equals(
    "limit 100 returns all 15 items",
    limit100.data.length,
    15,
  );
  TestValidator.equals(
    "limit 100 correct records",
    limit100.pagination.records,
    15,
  );
  TestValidator.equals("limit 100 correct pages", limit100.pagination.pages, 1);
  TestValidator.equals(
    "limit 100 correct limit",
    limit100.pagination.limit,
    100,
  );
  // 4. Test page-by-page retrieval with limit=5
  const page1Limit5 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 1, limit: 5 },
      },
    );
  typia.assert(page1Limit5);
  TestValidator.equals(
    "page 1 limit 5 returns 5 items",
    page1Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "page 1 limit 5 correct records",
    page1Limit5.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 limit 5 correct pages",
    page1Limit5.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 1 limit 5 correct current",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 5 correct limit",
    page1Limit5.pagination.limit,
    5,
  );
  const page2Limit5 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page 2 limit 5 returns 5 items",
    page2Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 limit 5 correct current",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 5 correct limit",
    page2Limit5.pagination.limit,
    5,
  );
  // Verify no duplicates between pages
  const page1Ids = page1Limit5.data.map((item) => item.id);
  const page2Ids = page2Limit5.data.map((item) => item.id);
  for (const id1 of page1Ids) {
    TestValidator.predicate(
      `page 1 item ${id1} not in page 2`,
      !page2Ids.includes(id1),
    );
  }
  const page3Limit5 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 3, limit: 5 },
      },
    );
  typia.assert(page3Limit5);
  TestValidator.equals(
    "page 3 limit 5 returns 5 items",
    page3Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "page 3 limit 5 correct current",
    page3Limit5.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit 5 correct pages",
    page3Limit5.pagination.pages,
    3,
  );
  // Verify no duplicates across all pages
  const page3Ids = page3Limit5.data.map((item) => item.id);
  const allPageIds = [...page1Ids, ...page2Ids, ...page3Ids];
  const uniquePageIds = new Set(allPageIds);
  TestValidator.equals(
    "no duplicates across 3 pages",
    uniquePageIds.size,
    allPageIds.length,
  );
  // 5. Test sorting consistency across pagination
  const sortedPage1 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 1, limit: 10, sort: "created_at", sortDirection: "desc" },
      },
    );
  typia.assert(sortedPage1);
  const sortedPage2 =
    await api.functional.ecommerceMall.customer.wishlist.index(
      paginatedConnection,
      {
        body: { page: 2, limit: 10, sort: "created_at", sortDirection: "desc" },
      },
    );
  typia.assert(sortedPage2);
  // Verify sorting order is maintained (created_at descending)
  if (sortedPage1.data.length > 0 && sortedPage2.data.length > 0) {
    const lastItemPage1 = sortedPage1.data[sortedPage1.data.length - 1];
    const firstItemPage2 = sortedPage2.data[0];
    TestValidator.predicate(
      "sorting preserved across pages",
      new Date(lastItemPage1.createdAt) >= new Date(firstItemPage2.createdAt),
    );
  }
}