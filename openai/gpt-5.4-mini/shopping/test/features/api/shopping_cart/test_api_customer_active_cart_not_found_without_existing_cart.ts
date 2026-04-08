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

export async function test_api_customer_active_cart_not_found_without_existing_cart(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a newly registered customer without an active shopping cart receives a not-found response.
   *
   * This test registers a fresh customer session and then queries the active cart endpoint. It validates that the backend does not create a cart implicitly for a customer who has never used cart functionality.
   *
   * 1. Register and authenticate a brand-new customer account.
   * 2. Call the active shopping cart endpoint using the authenticated customer connection.
   * 3. Assert that the request fails with a not-found HTTP error because no cart exists yet.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "active cart should not exist for a new customer",
    404,
    async () => {
      await api.functional.mallPlatform.customer.carts.active.at(
        customerConnection,
      );
    },
  );
}
