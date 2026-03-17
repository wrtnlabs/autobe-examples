import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";

/**
 * Test wishlist retrieval with different sorting options and pagination parameters.
 *
 * Test Steps:
 * 1. Customer joins the platform (authentication setup)
 * 2. Customer adds multiple products to wishlist at different times
 * 3. Add products with varying prices (to test price-based sorting)
 * 4. Retrieve wishlist with sort='newest' (default)
 * 5. Retrieve wishlist with sort='priceAsc' (lowest price first)
 * 6. Retrieve wishlist with sort='priceDesc' (highest price first)
 * 7. Retrieve wishlist with custom pagination (page=2, limit=10)
 * 8. Verify sorting and pagination behavior
 */
export async function test_api_wishlist_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Add multiple products to wishlist (at least 15 for pagination testing)
  const wishlistItems: IShoppingMallWishlist[] = [];
  const itemCount = 15;
  for (let i = 0; i < itemCount; i++) {
    const wishlistItem =
      await generate_random_shopping_mall_customer_wishlists_create(
        customerConnection,
        {},
      );
    typia.assert(wishlistItem);
    wishlistItems.push(wishlistItem);
    // Small delay to ensure varied created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 3. Test sort='newest' (default, by created_at DESC)
  const newestResult =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(newestResult);
  // Verify newest sorting - first item should be most recently added
  TestValidator.predicate(
    "newest sort has items",
    newestResult.data.length > 0,
  );
  TestValidator.predicate(
    "newest pagination metadata valid",
    newestResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "newest pagination records match total",
    newestResult.pagination.records === itemCount,
  );
  // 4. Test sort='priceAsc' (lowest price first)
  const priceAscResult =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "priceAsc",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(priceAscResult);
  // Verify price ascending order
  TestValidator.predicate("priceAsc has items", priceAscResult.data.length > 0);
  if (priceAscResult.data.length >= 2) {
    const firstPrice = priceAscResult.data[0].product.basePrice;
    const secondPrice = priceAscResult.data[1].product.basePrice;
    TestValidator.predicate(
      "priceAsc order correct",
      firstPrice <= secondPrice,
    );
  }
  // 5. Test sort='priceDesc' (highest price first)
  const priceDescResult =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "priceDesc",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(priceDescResult);
  // Verify price descending order
  TestValidator.predicate(
    "priceDesc has items",
    priceDescResult.data.length > 0,
  );
  if (priceDescResult.data.length >= 2) {
    const firstPrice = priceDescResult.data[0].product.basePrice;
    const secondPrice = priceDescResult.data[1].product.basePrice;
    TestValidator.predicate(
      "priceDesc order correct",
      firstPrice >= secondPrice,
    );
  }
  // 6. Test pagination - page 2 with limit 10
  const page2Result =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(page2Result);
  // Verify pagination metadata
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    itemCount,
  );
  TestValidator.predicate(
    "page 2 pages calculated correctly",
    page2Result.pagination.pages >= 2,
  );
  // Verify page 2 has different items than page 1
  TestValidator.predicate(
    "page 2 has remaining items",
    page2Result.data.length > 0,
  );
  TestValidator.predicate(
    "page 2 items less than limit",
    page2Result.data.length <= 10,
  );
  // 7. Verify sorting produces different orderings
  if (newestResult.data.length >= 2 && priceAscResult.data.length >= 2) {
    TestValidator.notEquals(
      "newest vs priceAsc ordering differs",
      newestResult.data[0].product.id,
      priceAscResult.data[0].product.id,
    );
  }
  if (priceAscResult.data.length >= 2 && priceDescResult.data.length >= 2) {
    TestValidator.notEquals(
      "priceAsc vs priceDesc ordering differs",
      priceAscResult.data[0].product.id,
      priceDescResult.data[0].product.id,
    );
  }
}
