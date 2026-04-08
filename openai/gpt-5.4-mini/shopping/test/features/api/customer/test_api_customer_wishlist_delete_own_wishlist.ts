import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Delete the authenticated customer's own wishlist.
 *
 * Verifies that a signed-in customer can remove their wishlist container without
 * affecting catalog records or the customer's own account session. The test
 * covers the happy path of deleting an existing wishlist and confirms that the
 * API completes successfully with no response body.
 *
 * 1. Register a fresh customer account and obtain an authenticated connection.
 * 2. Invoke wishlist deletion for the authenticated customer.
 * 3. Invoke wishlist deletion again to confirm the operation is idempotent.
 */
export async function test_api_customer_wishlist_delete_own_wishlist(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await api.functional.mallPlatform.customer.wishlists.erase(
    customerConnection,
  );
  await api.functional.mallPlatform.customer.wishlists.erase(
    customerConnection,
  );
}
