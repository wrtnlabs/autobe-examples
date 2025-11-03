import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_shopping_cart_create_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = "samplepassword123";
  const nickname = RandomGenerator.name();

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      nickname,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Create a new shopping cart for this customer using the last session from customer token
  // The session id is accessible in customer for shopping mall usage via shopping_mall_customer_session_id
  // But since the customer object does not expose session explicitly, we use the token data to get the session id
  // For this mock, let's assume the customer id is used for shopping_mall_customer_id and we generate a new UUID for session
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const cartRequestBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_customer_session_id: sessionId,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const cart = await api.functional.shoppingMall.customer.shoppingCarts.create(
    connection,
    {
      body: cartRequestBody,
    },
  );
  typia.assert(cart);

  TestValidator.equals(
    "customer id matches cart",
    cart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "session id matches cart",
    cart.shopping_mall_customer_session_id,
    sessionId,
  );

  TestValidator.predicate(
    "cart has created_at timestamp",
    typeof cart.created_at === "string" && cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart has updated_at timestamp",
    typeof cart.updated_at === "string" && cart.updated_at.length > 0,
  );
}
