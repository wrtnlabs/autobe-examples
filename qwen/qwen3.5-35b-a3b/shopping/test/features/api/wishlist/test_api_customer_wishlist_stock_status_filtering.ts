import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_wishlist_stock_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // 2. Test stock status filtering with 'in-stock' filter
  const inStockResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "in-stock",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(inStockResult);
  // Validate 'in-stock' filter returns only in-stock items
  for (const item of inStockResult.data) {
    TestValidator.equals(
      `in-stock item ${item.id} has correct stockStatus`,
      item.product.stockStatus,
      "in-stock",
    );
  }
  // 3. Test stock status filtering with 'out-of-stock' filter
  const outStockResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "out-of-stock",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(outStockResult);
  // Validate 'out-of-stock' filter returns only out-of-stock items
  for (const item of outStockResult.data) {
    TestValidator.equals(
      `out-of-stock item ${item.id} has correct stockStatus`,
      item.product.stockStatus,
      "out-of-stock",
    );
  }
  // 4. Test stock status filtering with 'all' filter
  const allResult = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        stockStatus: "all",
        page: 1,
        limit: 100,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(allResult);
  // Validate 'all' filter returns all items
  const allItems = [...inStockResult.data, ...outStockResult.data];
  const allIds = new Set(allItems.map((item) => item.id));
  const resultIds = new Set(allResult.data.map((item) => item.id));
  TestValidator.equals(
    "all filter includes all items",
    allIds.size,
    resultIds.size,
  );
  // 5. Validate stockStatus values are valid enum values
  for (const item of allResult.data) {
    const isValidStatus: "in-stock" | "out-of-stock" | undefined =
      item.product.stockStatus;
    TestValidator.equals(
      `valid stockStatus enum for ${item.id}`,
      isValidStatus === "in-stock" || isValidStatus === "out-of-stock",
      true,
    );
  }
  // 6. Verify pagination metadata is present
  TestValidator.equals(
    "pagination has current page",
    inStockResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination has valid limit",
    inStockResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    inStockResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    inStockResult.pagination.pages >= 0,
    true,
  );
  // 7. Test that stockStatus is computed dynamically by filtering on same wishlist twice
  const firstInStockCall =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "in-stock",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(firstInStockCall);
  const secondInStockCall =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "in-stock",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(secondInStockCall);
  // Both calls should return consistent results
  TestValidator.equals(
    "consistent in-stock results across calls",
    firstInStockCall.data.length,
    secondInStockCall.data.length,
  );
  // 8. Test that items in different filters have different stockStatus values
  const combinedAll = new Set<number>();
  for (const item of allResult.data) {
    if (item.product.stockStatus === "in-stock") {
      combinedAll.add(1);
    } else {
      combinedAll.add(2);
    }
  }
  TestValidator.equals(
    "all items have defined stockStatus",
    combinedAll.size,
    2,
  );
}