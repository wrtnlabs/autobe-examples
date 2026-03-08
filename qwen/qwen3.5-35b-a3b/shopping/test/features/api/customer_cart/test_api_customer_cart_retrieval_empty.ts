import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_customer_cart_retrieval_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create customer-specific connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Retrieve customer's cart (system auto-creates cart with random UUID)
  const cartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const cart = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: cartId,
    },
  );
  typia.assert(cart);
  // 4. Validate cart metadata and empty state
  TestValidator.equals("cart_id is valid UUID format", cart.id, cartId);
  TestValidator.equals(
    "customer_id matches registered customer",
    cart.customer_id,
    customer.id,
  );
  TestValidator.equals("cart_items array is empty", cart.cart_items.length, 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(cart.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(cart.updated_at).getTime()),
  );
  TestValidator.equals("cart was automatically created", cartId, cart.id);
}