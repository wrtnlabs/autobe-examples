import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can retrieve their shopping cart items with full product, variant, and seller information.
 *
 * This test validates the cart items listing endpoint by:
 * 1. Registering a new customer account
 * 2. Retrieving cart items with default pagination
 * 3. Verifying response structure includes all nested objects (variant, product, seller)
 * 4. Validating pagination metadata
 */
export async function test_api_cart_items_list_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Retrieve cart items with default pagination
  const response: IPageIShoppingMallCartItem.ISummary =
    await api.functional.shoppingMall.customer.cart_items.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate cart items structure
  await ArrayUtil.asyncForEach(response.data, async (cartItem, index) => {
    typia.assert(cartItem);
    // Validate cart item basic fields
    TestValidator.predicate(
      `cart item ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cartItem.id,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} has positive quantity`,
      cartItem.quantity > 0,
    );
    TestValidator.predicate(
      `cart item ${index} has valid created_at`,
      cartItem.created_at.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} has valid updated_at`,
      cartItem.updated_at.length > 0,
    );
    // Validate product variant details
    typia.assert(cartItem.variant);
    TestValidator.predicate(
      `cart item ${index} variant has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cartItem.variant.id,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} variant has SKU code`,
      cartItem.variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} variant has option values`,
      cartItem.variant.option_values.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} variant has non-negative stock`,
      cartItem.variant.stock_quantity >= 0,
    );
    TestValidator.predicate(
      `cart item ${index} variant availability matches stock`,
      cartItem.variant.available === cartItem.variant.stock_quantity > 0,
    );
    // Validate product information
    typia.assert(cartItem.product);
    TestValidator.predicate(
      `cart item ${index} product has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cartItem.product.id,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} product has name`,
      cartItem.product.name.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} product has description`,
      cartItem.product.description.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} product has positive base price`,
      cartItem.product.basePrice > 0,
    );
    // Validate product category
    typia.assert(cartItem.product.category);
    TestValidator.predicate(
      `cart item ${index} product category has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cartItem.product.category.id,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} product category has name`,
      cartItem.product.category.name.length > 0,
    );
    // Validate seller information
    typia.assert(cartItem.seller);
    TestValidator.predicate(
      `cart item ${index} seller has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cartItem.seller.id,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} seller has valid email`,
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        cartItem.seller.email,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} seller has shop name`,
      cartItem.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      `cart item ${index} seller has approval status`,
      ["pending", "approved", "rejected", "suspended"].includes(
        cartItem.seller.approval_status,
      ),
    );
    TestValidator.predicate(
      `cart item ${index} seller has valid status`,
      ["active", "banned"].includes(cartItem.seller.status),
    );
  });
}
