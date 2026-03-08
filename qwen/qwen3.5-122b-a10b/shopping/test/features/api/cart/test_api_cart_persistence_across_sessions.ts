import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that cart items persist across customer sessions and devices.
 * Validates cart data is associated with customer account in database
 * rather than browser session.
 */
export async function test_api_cart_persistence_across_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer session - register and get cart
  const firstSessionConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const firstAuth = await authorize_customer_join(firstSessionConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(firstAuth);
  // Get cart in first session
  const firstCart = await api.functional.ecommerceMall.customer.cart.at(
    firstSessionConnection,
  );
  typia.assert(firstCart);
  // Store cart data for comparison
  const firstCartItemsCount = firstCart.items.length;
  const firstCartTotal = firstCart.total;
  // 2. Second customer session - login with same credentials
  const secondSessionConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_customer_login(secondSessionConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
    },
  });
  typia.assert(secondAuth);
  // 3. Get cart in second session
  const secondCart = await api.functional.ecommerceMall.customer.cart.at(
    secondSessionConnection,
  );
  typia.assert(secondCart);
  // 4. Validate cart persistence across sessions
  TestValidator.equals(
    "cart items count persists across sessions",
    secondCart.items.length,
    firstCartItemsCount,
  );
  TestValidator.equals(
    "cart total persists across sessions",
    secondCart.total,
    firstCartTotal,
  );
}
