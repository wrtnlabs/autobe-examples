import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_cart_creation_without_authentication(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (headers: {})
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to create a cart with no authentication - must return 401
  await TestValidator.error(
    "cart creation without authentication should fail with 401 Unauthorized",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(unauthConn, {
        body: "" satisfies IShoppingMallCart.ICreate,
      });
    },
  );
}
