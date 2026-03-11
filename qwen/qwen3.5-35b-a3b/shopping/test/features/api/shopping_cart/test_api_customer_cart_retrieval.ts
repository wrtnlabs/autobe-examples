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

export async function test_api_customer_cart_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create shopping cart for the authenticated customer
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Retrieve the cart by cartId
  const retrievedCart = await api.functional.ecommerceMall.customer.carts.at(
    customerConnection,
    {
      cartId: cart.id,
    },
  );
  typia.assert(retrievedCart);
  // 4. Validate cart id matches
  TestValidator.equals(
    "cart id matches created cart",
    retrievedCart.id,
    cart.id,
  );
  // 5. Validate customer ownership (data isolation)
  TestValidator.equals(
    "cart customer id matches authenticated customer id",
    retrievedCart.customer.id,
    customer.id,
  );
  // 6. Validate customer email matches
  TestValidator.equals(
    "cart customer email matches authenticated customer email",
    retrievedCart.customer.email,
    customer.email,
  );
  // 7. Validate customer display_name exists
  TestValidator.predicate(
    "customer has non-empty display_name",
    retrievedCart.customer.display_name.length > 0,
  );
  // 8. Validate ban status (new customer should not be banned)
  TestValidator.equals(
    "new customer is not banned",
    retrievedCart.customer.is_banned,
    false,
  );
  // 9. Validate customer created_at timestamp format
  TestValidator.predicate("created_at is valid ISO 8601 date-time", () =>
    typia.is<string & tags.Format<"date-time">>(retrievedCart.created_at),
  );
  // 10. Validate updated_at timestamp format
  TestValidator.predicate("updated_at is valid ISO 8601 date-time", () =>
    typia.is<string & tags.Format<"date-time">>(retrievedCart.updated_at),
  );
  // 11. Validate updated_at >= created_at
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(retrievedCart.updated_at) >= new Date(retrievedCart.created_at),
  );
  // 12. Validate customer created_at format
  TestValidator.predicate(
    "customer created_at is valid ISO 8601 date-time",
    () => typia.is<string & tags.Format<"date-time">>(customer.created_at),
  );
  // 13. Validate customer updated_at format
  TestValidator.predicate(
    "customer updated_at is valid ISO 8601 date-time",
    () => typia.is<string & tags.Format<"date-time">>(customer.updated_at),
  );
  // 14. Validate cart timestamps are after customer creation
  TestValidator.predicate(
    "cart created_at is after customer created_at",
    new Date(retrievedCart.created_at) >= new Date(customer.created_at),
  );
  // 15. Verify no null or undefined critical fields
  TestValidator.equals("cart id is not null", retrievedCart.id !== null, true);
  TestValidator.equals(
    "customer is not null",
    retrievedCart.customer !== null,
    true,
  );
  TestValidator.equals(
    "customer id is not null",
    retrievedCart.customer.id !== null,
    true,
  );
}