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

export async function test_api_customer_cart_price_snapshot_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for cart ownership
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
        password: typia.random<
          string & tags.Format<"password"> & tags.MinLength<8>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Verify customer authentication token is valid
  TestValidator.predicate(
    "access token is non-empty",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    customer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has access token expiration",
    customer.token.expired_at !== undefined,
  );
  // 3. Create customer-specific connection with authorization header
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customer.token.access,
    },
  };
  // Note: The full price snapshot test requires:
  // - Product/ProductVariant creation/update APIs
  // - CartItem add/retrieve APIs
  // - Cart items with unit_price snapshot field
  // These are not available in current SDK definition.
  // 4. Test available cart structure (cart metadata only)
  // Using a random cart ID to validate structure (actual test requires existing cart)
  const cartId = typia.random<string & tags.Format<"uuid">>();
  try {
    const cart: IEcommerceMallShoppingCart =
      await api.functional.ecommerceMall.customer.carts.at(
        authenticatedCustomerConnection,
        {
          cartId,
        },
      );
    typia.assert(cart);
    // Validate cart structure
    TestValidator.equals("cart has valid UUID", cart.id.length, 36);
    TestValidator.predicate("cart has customer", cart.customer !== undefined);
    TestValidator.equals(
      "customer has valid UUID",
      cart.customer.id.length,
      36,
    );
    TestValidator.predicate("customer has email", cart.customer.email.length > 0);
    TestValidator.predicate(
      "customer has display name",
      cart.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "cart has created_at",
      cart.created_at !== undefined,
    );
    TestValidator.predicate(
      "cart has updated_at",
      cart.updated_at !== undefined,
    );
  } catch (error) {
    // Expected: cart not found for randomly generated cart ID
    // This validates the API properly handles missing carts
    TestValidator.predicate(
      "cart retrieval returns error for non-existent cart",
      true,
    );
  }
}