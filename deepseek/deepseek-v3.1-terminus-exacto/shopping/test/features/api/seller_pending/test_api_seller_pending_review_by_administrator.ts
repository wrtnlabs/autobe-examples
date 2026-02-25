import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_review_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create multiple seller accounts using the available utility function
  const sellers: IEcommerceSeller.IAuthorized[] = [];
  for (let i = 0; i < 15; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.paragraph({ sentences: 1 }),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    sellers.push(seller);
  }
  // Step 2: Use seller connection for API calls (as per endpoint authorization)
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 3: Test first page with default pagination
  const firstPage = await api.functional.ecommerce.seller.pending.index(
    sellerConnection,
    {
      body: {
        account_status: "pending_approval",
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(firstPage);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate("has records", firstPage.pagination.records > 0);
  TestValidator.predicate("has pages", firstPage.pagination.pages > 0);
  // Step 5: Validate all returned sellers have pending approval status
  for (const seller of firstPage.data) {
    TestValidator.equals(
      "seller status is pending_approval",
      seller.account_status,
      "pending_approval",
    );
    TestValidator.predicate(
      "has valid email",
      /^[^@]+@[^@]+\.[^@]+$/.test(seller.email),
    );
    TestValidator.predicate("has shop name", seller.shop_name.length > 0);
    TestValidator.predicate(
      "has valid created_at",
      seller.created_at.length > 0,
    );
  }
  // Step 6: Test second page with smaller limit
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.ecommerce.seller.pending.index(
      sellerConnection,
      {
        body: {
          account_status: "pending_approval",
          page: 2,
          limit: 5,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
    // Verify different pages have different data
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "first and second page have different data",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // Step 7: Test search functionality
  if (firstPage.data.length > 0) {
    const searchTerm = firstPage.data[0].shop_name.substring(0, 3);
    const searched = await api.functional.ecommerce.seller.pending.index(
      sellerConnection,
      {
        body: {
          search: searchTerm,
          account_status: "pending_approval",
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
    typia.assert(searched);
    // Verify search results contain the search term (case insensitive)
    const hasMatch = searched.data.some((seller) =>
      seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.predicate(
      "search found matching results",
      hasMatch || searched.data.length === 0,
    );
  }
  // Step 8: Test date range filtering (created_after)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const filteredByDate = await api.functional.ecommerce.seller.pending.index(
    sellerConnection,
    {
      body: {
        account_status: "pending_approval",
        created_after: yesterday,
        page: 1,
        limit: 10,
      } satisfies IEcommerceSeller.IRequest,
    },
  );
  typia.assert(filteredByDate);
  // All returned sellers should be created after the specified date
  for (const seller of filteredByDate.data) {
    TestValidator.predicate(
      "seller created after filter date",
      new Date(seller.created_at) > new Date(yesterday),
    );
  }
}
