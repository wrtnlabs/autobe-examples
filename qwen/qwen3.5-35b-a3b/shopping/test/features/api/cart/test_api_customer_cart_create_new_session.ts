import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_create_new_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joinResponse: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: typia.random<
          string & tags.MinLength<8> & tags.Format<"password">
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(joinResponse);
  // 2. Create customer-specific connection with JWT token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: joinResponse.token.access };
  // 3. Create shopping cart
  const cart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 4. Validate cart structure
  TestValidator.equals(
    "customer email matches registered email",
    cart.customer.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "customer is_banned status preserved",
    cart.customer.is_banned,
    joinResponse.is_banned,
  );
  TestValidator.equals(
    "customer display_name is set",
    cart.customer.display_name.length > 0,
    true,
  );
}
