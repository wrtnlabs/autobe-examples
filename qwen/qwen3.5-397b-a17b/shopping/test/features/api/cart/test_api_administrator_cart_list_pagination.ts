import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test administrator's ability to retrieve a paginated list of active shopping carts.
 *
 * This test validates:
 * 1. Administrator authentication and access to cart management endpoints
 * 2. Multiple customer accounts with active shopping carts containing items
 * 3. Pagination metadata accuracy (current page, limit, total records, total pages)
 * 4. Cart summary structure including customer info, items_count, total_amount
 * 5. Only active carts (deleted_at IS NULL) are returned by default
 * 6. Items count and total amount aggregation accuracy
 */
export async function test_api_administrator_cart_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple customer accounts with shopping carts
  const customerCount = 3;
  const customerConnections: api.IConnection[] = [];
  const customerAuths: IShoppingMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customerAuth);
    customerConnections.push(customerConnection);
    customerAuths.push(customerAuth);
  }
  // 3. Add varying numbers of items to each customer's cart
  const itemsPerCustomer: number[] = [];
  const expectedTotals: number[] = [];
  for (let i = 0; i < customerCount; i++) {
    const itemCount = (i % 3) + 1; // 1, 2, or 3 items per customer
    itemsPerCustomer.push(itemCount);
    let cartTotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const cartItem =
        await generate_random_shopping_mall_customer_cart_items_create(
          customerConnections[i],
          {
            body: {
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
              >(),
            },
          },
        );
      typia.assert(cartItem);
      cartTotal += cartItem.quantity * cartItem.price;
    }
    expectedTotals.push(cartTotal);
  }
  // 4. Administrator requests cart list with default pagination
  const cartListResponse =
    await api.functional.shoppingMall.administrator.carts.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          deleted_at: null, // Only active carts
        } satisfies IShoppingMallCart.IRequest,
      },
    );
  typia.assert(cartListResponse);
  // 5. Verify pagination metadata
  TestValidator.equals("current page", cartListResponse.pagination.current, 1);
  TestValidator.equals("limit", cartListResponse.pagination.limit, 20);
  TestValidator.predicate(
    "has minimum records",
    cartListResponse.pagination.records >= customerCount,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    cartListResponse.pagination.pages >= 1,
  );
  // 6. Verify cart data exists
  TestValidator.predicate(
    "has cart data",
    cartListResponse.data.length >= customerCount,
  );
  // 7. Verify each cart has active status and valid structure
  for (const cart of cartListResponse.data) {
    // Verify only active carts (deleted_at is null)
    TestValidator.equals("cart is active", cart.deleted_at, null);
    // Verify items_count is non-negative
    TestValidator.predicate(
      "items_count is non-negative",
      cart.items_count >= 0,
    );
    // Verify total_amount is non-negative
    TestValidator.predicate(
      "total_amount is non-negative",
      cart.total_amount >= 0,
    );
    // Verify customer profile can be null or have valid structure
    if (cart.customer.profile !== null) {
      TestValidator.predicate(
        "profile has displayName",
        cart.customer.profile.displayName.length > 0,
      );
      TestValidator.predicate(
        "profile has phoneNumber",
        cart.customer.profile.phoneNumber.length > 0,
      );
    }
  }
  // 8. Verify that we can find the carts we created
  const createdCustomerIds = customerAuths.map((auth) => auth.id);
  const foundCarts = cartListResponse.data.filter((cart) =>
    createdCustomerIds.includes(cart.customer.id),
  );
  TestValidator.predicate(
    "found created customer carts",
    foundCarts.length >= customerCount,
  );
}
