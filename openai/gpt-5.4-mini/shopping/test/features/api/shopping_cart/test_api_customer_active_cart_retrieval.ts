import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_active_cart_retrieval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an authenticated customer can retrieve the active cart resolved from session context.
   *
   * This test validates the customer-only active cart endpoint using a newly registered customer session.
   * It ensures the response is owned by the authenticated customer and that the persisted cart shape is returned
   * without inventing any client-supplied cart identifier or unavailable item fields.
   *
   * 1. Register a customer and establish an authenticated customer connection.
   * 2. Retrieve the active cart using the authenticated session connection.
   * 3. Validate the returned cart header and owner summary match the authenticated customer.
   * 4. Confirm the cart items collection is preserved in the stored representation returned by the API.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "http://localhost/customer/join",
      referrer: "http://localhost/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const cart =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(cart);
  TestValidator.equals(
    "cart owner should match authenticated customer",
    cart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart owner email should match authenticated customer",
    cart.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "cart owner status should match authenticated customer",
    cart.customer.status,
    authorized.status,
  );
  TestValidator.equals(
    "cart should be resolved from the authenticated session",
    cart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart items should preserve the stored response representation",
    cart.cartItems,
    null,
  );
}
