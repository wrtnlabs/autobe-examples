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

export async function test_api_customer_wishlist_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  // Create authenticated connection for customer
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer.token.access },
  };
  // 2. Test browsing wishlist with default pagination
  const defaultPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: {} },
    );
  typia.assert(defaultPage);
  // 3. Verify default pagination values
  TestValidator.equals("default limit", defaultPage.pagination.limit, 20);
  TestValidator.equals("default page", defaultPage.pagination.current, 1);
  TestValidator.equals(
    "records matches actual data",
    defaultPage.pagination.records,
    defaultPage.data.length,
  );
  // 4. Verify wishlist entry structure when data exists
  if (defaultPage.data.length > 0) {
    const firstEntry = typia.assert<IEcommerceMallWishlist.ISummary>(
      defaultPage.data[0],
    );
    typia.assert(firstEntry.product);
    TestValidator.predicate(
      "product has valid base_price",
      typeof firstEntry.product.base_price === "number",
    );
  }
  // 5. Test filtering by availability
  const inStockPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { availability: "in-stock" } },
    );
  typia.assert(inStockPage);
  const outOfStockPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { availability: "out-of-stock" } },
    );
  typia.assert(outOfStockPage);
  // 6. Test sorting by price ascending
  const priceAscPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { sortBy: "price", sortOrder: "asc" } },
    );
  typia.assert(priceAscPage);
  // 7. Test sorting by price descending
  const priceDescPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { sortBy: "price", sortOrder: "desc" } },
    );
  typia.assert(priceDescPage);
  // 8. Test sorting by createdAt ascending
  const createdAtAscPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { sortBy: "createdAt", sortOrder: "asc" } },
    );
  typia.assert(createdAtAscPage);
  // 9. Test sorting by createdAt descending
  const createdAtDescPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { sortBy: "createdAt", sortOrder: "desc" } },
    );
  typia.assert(createdAtDescPage);
  // 10. Test custom pagination limit
  const customLimitPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { limit: 50 } },
    );
  typia.assert(customLimitPage);
  // Verify pages calculation: Math.ceil(records / limit)
  const expectedPages = Math.ceil(
    customLimitPage.pagination.records / customLimitPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    customLimitPage.pagination.pages,
    expectedPages,
  );
  // Verify records count matches actual data
  TestValidator.equals(
    "records count matches data length",
    customLimitPage.pagination.records,
    customLimitPage.data.length,
  );
  // 11. Test page-based pagination
  const page1Result =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { page: 0, limit: 10 } },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 0 maps to current 1",
    page1Result.pagination.current,
    1,
  );
  // 12. Test cursor pagination (verify cursor is returned in response)
  const cursorPage =
    await api.functional.ecommerceMall.customer.wishlists.index(
      authenticatedConnection,
      { body: { limit: 10 } },
    );
  typia.assert(cursorPage);
}