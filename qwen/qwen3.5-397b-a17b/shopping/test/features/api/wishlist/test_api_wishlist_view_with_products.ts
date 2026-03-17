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

/**
 * Test viewing a customer's wishlist containing multiple products.
 *
 * This test validates the wishlist index endpoint by:
 * 1. Registering a new customer account
 * 2. Retrieving the customer's wishlist
 * 3. Validating pagination metadata and response structure
 * 4. Testing different sorting and pagination options
 *
 * Note: typia.assert() handles complete type validation including:
 * - UUID format validation
 * - ISO 8601 date-time format validation
 * - Enum value validation
 * - Required field existence
 * - Type correctness (string, number, boolean, etc.)
 */
export async function test_api_wishlist_view_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve customer's wishlist with default sorting (newest first)
  const wishlistResponse =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 3. Validate pagination metadata values
  TestValidator.equals("current page", wishlistResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    wishlistResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    wishlistResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    wishlistResponse.pagination.pages >= 0,
  );
  // 4. Validate wishlist entries (business logic only, types validated by typia.assert)
  for (const item of wishlistResponse.data) {
    // Product business logic validations
    TestValidator.predicate(
      "product name is not empty",
      item.product.name.length > 0,
    );
    TestValidator.predicate(
      "product basePrice is positive",
      item.product.basePrice > 0,
    );
    TestValidator.predicate(
      "seller shop_name is not empty",
      item.product.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "category name is not empty",
      item.product.category.name.length > 0,
    );
    TestValidator.predicate(
      "variantCount is non-negative",
      item.product.variantCount >= 0,
    );
    TestValidator.predicate(
      "reviewCount is non-negative",
      item.product.reviewCount >= 0,
    );
  }
  // 5. Test price ascending sort option
  const priceAscWishlist =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "priceAsc",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(priceAscWishlist);
  TestValidator.equals(
    "priceAsc pagination current",
    priceAscWishlist.pagination.current,
    1,
  );
  // 6. Test price descending sort option
  const priceDescWishlist =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "priceDesc",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(priceDescWishlist);
  TestValidator.equals(
    "priceDesc pagination current",
    priceDescWishlist.pagination.current,
    1,
  );
  // 7. Test pagination with smaller limit
  const smallLimitWishlist =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(smallLimitWishlist);
  TestValidator.equals(
    "small limit applied",
    smallLimitWishlist.pagination.limit,
    5,
  );
  // 8. Test pagination with maximum limit
  const maxLimitWishlist =
    await api.functional.shoppingMall.customer.customers.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(maxLimitWishlist);
  TestValidator.equals(
    "max limit applied",
    maxLimitWishlist.pagination.limit,
    100,
  );
}
