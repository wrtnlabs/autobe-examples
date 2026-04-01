import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_customer_cart_list_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 3. Add multiple items to cart using utility function
  const cartItemCount = 3;
  const cartItems: IShoppingMallCartItem[] = [];
  for (let i = 0; i < cartItemCount; i++) {
    const cartItem =
      await generate_random_shopping_mall_customer_cart_items_create(
        customerConnection,
        {},
      );
    typia.assert(cartItem);
    cartItems.push(cartItem);
  }
  // 4. Retrieve cart list
  const cartList = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        deleted_at: null,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(cartList);
  // 5. Validate cart list structure
  TestValidator.predicate("cart list has data", cartList.data.length > 0);
  TestValidator.predicate(
    "pagination has records",
    cartList.pagination.records > 0,
  );
  // 6. Find the active cart for this customer
  const customerCart = cartList.data.find(
    (cart) => cart.customer.id === customerAuth.id && cart.deleted_at === null,
  );
  TestValidator.predicate("customer cart exists", customerCart !== undefined);
  if (customerCart) {
    // 7. Validate items_count matches number of cart items
    TestValidator.equals(
      "items_count matches cart items",
      customerCart.items_count,
      cartItems.length,
    );
    // 8. Validate total_amount calculation
    const expectedTotal = cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    TestValidator.equals(
      "total_amount calculated correctly",
      customerCart.total_amount,
      expectedTotal,
    );
    // 9. Validate customer reference
    TestValidator.equals(
      "customer id matches",
      customerCart.customer.id,
      customerAuth.id,
    );
    TestValidator.equals(
      "customer email matches",
      customerCart.customer.email,
      customerAuth.email,
    );
    // 10. Validate cart is active
    TestValidator.predicate(
      "cart is active (not deleted)",
      customerCart.deleted_at === null,
    );
    // 11. Validate timestamps exist
    TestValidator.predicate(
      "created_at exists",
      customerCart.created_at !== null,
    );
    TestValidator.predicate(
      "updated_at exists",
      customerCart.updated_at !== null,
    );
  }
}
