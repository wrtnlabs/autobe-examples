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

/**
 * Verifies safe no-op removal for a missing shopping cart item.
 *
 * This test validates that deleting a cart item which is not present in the
 * authenticated customer's active cart completes successfully and does not
 * disturb the cart's persisted identity or ownership.
 *
 * 1. Register and authenticate a customer using an isolated connection.
 * 2. Read the customer's active cart and capture its stable state.
 * 3. Call the delete endpoint with a guaranteed-missing cart item identifier.
 * 4. Re-read the active cart and confirm the cart identity and owner remain
 *    unchanged.
 */
export async function test_api_cart_item_remove_missing_item_noop(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` satisfies string,
      password: "Password123!" satisfies string,
      href: "https://example.com/register",
      referrer: "https://example.com/referrer",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const before =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(before);
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.mallPlatform.customer.carts.items.erase(
    customerConnection,
    {
      cartId: before.id,
      cartItemId,
    },
  );
  const after =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(after);
  TestValidator.equals("cart id should remain unchanged", after.id, before.id);
  TestValidator.equals(
    "cart owner id should remain unchanged",
    after.customer.id,
    before.customer.id,
  );
  TestValidator.equals(
    "cart owner email should remain unchanged",
    after.customer.email,
    before.customer.email,
  );
  TestValidator.equals(
    "cart deletion state should remain unchanged",
    after.deletedAt,
    before.deletedAt,
  );
}
