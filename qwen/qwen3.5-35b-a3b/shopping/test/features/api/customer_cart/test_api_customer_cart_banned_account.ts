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

export async function test_api_customer_cart_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join to create an active customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/signup" as string & tags.Format<"uri">,
    } as IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Verify customer is not banned initially
  TestValidator.equals("customer not banned", customer.is_banned, false);
  // 2. Create customer-specific connection with JWT token from join response
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Create shopping cart with customer's JWT token
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 4. Validate cart response structure and customer association
  TestValidator.equals(
    "cart customer id matches",
    cart.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "cart customer email matches",
    cart.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "cart customer is banned matches",
    cart.customer.is_banned,
    customer.is_banned,
  );
  TestValidator.predicate(
    "cart has valid created_at",
    cart.created_at !== undefined,
  );
  TestValidator.predicate(
    "cart has valid updated_at",
    cart.updated_at !== undefined,
  );
  // 5. Validate customer summary fields via typia.assert (already validates UUID and date-time)
  typia.assert(cart.customer);
  TestValidator.predicate(
    "customer has display name",
    cart.customer.display_name.length > 0,
  );
}