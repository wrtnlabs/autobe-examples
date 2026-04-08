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
 * Test idempotent removal of a missing customer wishlist item.
 *
 * Verifies that deleting a wishlist item identifier that is already absent
 * succeeds as a safe no-op, while preserving the authenticated customer session
 * and avoiding any unintended side effects from repeated deletion attempts.
 *
 * 1. Register and authenticate a customer in an isolated connection.
 * 2. Generate a UUID that does not correspond to a known wishlist item.
 * 3. Call the wishlist item erase endpoint twice with the same missing id.
 * 4. Confirm both calls complete successfully without raising an error.
 */
export async function test_api_customer_wishlist_item_idempotent_removal(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const wishlistItemId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.mallPlatform.customer.wishlists.items.erase(
    customerConnection,
    {
      wishlistItemId,
    },
  );
  await api.functional.mallPlatform.customer.wishlists.items.erase(
    customerConnection,
    {
      wishlistItemId,
    },
  );
}
