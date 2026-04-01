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

export async function test_api_customer_cart_create_or_return_active_cart(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234" satisfies string,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstCart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(firstCart);
  TestValidator.equals("cart owner id", firstCart.customer.id, joined.id);
  TestValidator.equals(
    "cart owner email",
    firstCart.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "cart owner status",
    firstCart.customer.status,
    joined.status,
  );
  TestValidator.equals(
    "cart owner createdAt",
    firstCart.customer.created_at,
    joined.createdAt,
  );
  TestValidator.equals(
    "cart owner updatedAt",
    firstCart.customer.updated_at,
    joined.updatedAt,
  );
  TestValidator.equals(
    "cart owner deletedAt",
    firstCart.customer.deleted_at,
    joined.deletedAt,
  );
  TestValidator.equals(
    "initial cart items should be null",
    firstCart.cartItems,
    null,
  );
  TestValidator.equals(
    "cart deletedAt should be null",
    firstCart.deletedAt,
    null,
  );
  const secondCart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(secondCart);
  TestValidator.equals(
    "same cart id returned on repeated creation",
    secondCart.id,
    firstCart.id,
  );
  TestValidator.equals(
    "same cart owner returned on repeated creation",
    secondCart.customer.id,
    firstCart.customer.id,
  );
  TestValidator.equals(
    "same empty cart items returned on repeated creation",
    secondCart.cartItems,
    firstCart.cartItems,
  );
  TestValidator.equals(
    "same cart createdAt returned on repeated creation",
    secondCart.createdAt,
    firstCart.createdAt,
  );
  TestValidator.equals(
    "same cart updatedAt returned on repeated creation",
    secondCart.updatedAt,
    firstCart.updatedAt,
  );
  TestValidator.equals(
    "same cart deletedAt returned on repeated creation",
    secondCart.deletedAt,
    firstCart.deletedAt,
  );
}
