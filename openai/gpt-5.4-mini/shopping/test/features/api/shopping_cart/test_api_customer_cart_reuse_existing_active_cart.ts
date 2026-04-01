import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_reuse_existing_active_cart(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstCart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(firstCart);
  const secondCart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(secondCart);
  TestValidator.equals("cart id should be reused", secondCart.id, firstCart.id);
  TestValidator.equals(
    "cart customer id should match authenticated customer",
    firstCart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart customer email should match authenticated customer",
    firstCart.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "second cart customer id should match authenticated customer",
    secondCart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "second cart customer email should match authenticated customer",
    secondCart.customer.email,
    authorized.email,
  );
  TestValidator.equals("cart items should be empty", firstCart.cartItems, null);
  TestValidator.equals(
    "cart items should remain empty",
    secondCart.cartItems,
    null,
  );
  TestValidator.equals(
    "cart deletedAt should be null",
    firstCart.deletedAt,
    null,
  );
  TestValidator.equals(
    "second cart deletedAt should be null",
    secondCart.deletedAt,
    null,
  );
  TestValidator.equals(
    "cart customer summary should remain stable",
    firstCart.customer,
    secondCart.customer,
  );
}
