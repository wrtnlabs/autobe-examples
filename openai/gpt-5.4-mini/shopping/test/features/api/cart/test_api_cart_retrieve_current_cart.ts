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

export async function test_api_cart_retrieve_current_cart(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const cart =
    await api.functional.mallPlatform.customer.carts.get(customerConnection);
  typia.assert(cart);
  TestValidator.equals(
    "cart owner id matches authenticated customer",
    cart.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "cart owner email matches authenticated customer",
    cart.customer.email,
    joined.email,
  );
  TestValidator.predicate("cart has a valid identifier", cart.id.length > 0);
  TestValidator.predicate(
    "cart has timestamps",
    cart.createdAt.length > 0 && cart.updatedAt.length > 0,
  );
  TestValidator.equals("cart is not soft deleted", cart.deletedAt, null);
  TestValidator.equals(
    "customer summary status is active",
    cart.customer.status,
    joined.status,
  );
}
