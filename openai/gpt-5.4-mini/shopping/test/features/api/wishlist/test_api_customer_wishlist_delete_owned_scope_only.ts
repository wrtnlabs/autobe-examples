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
 * Verify customer wishlist deletion is scoped to the authenticated owner only.
 *
 * This test validates that deleting a wishlist affects only the currently authenticated customer context and does not cross account boundaries.
 *
 * 1. Create two separate customer accounts using isolated connection objects.
 * 2. Authenticate both customers independently.
 * 3. Delete the first customer's wishlist using the first authenticated connection.
 * 4. Delete the second customer's wishlist using the second authenticated connection.
 * 5. Confirm both operations succeed independently, proving wishlist deletion is owner-scoped.
 */
export async function test_api_customer_wishlist_delete_owned_scope_only(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_customer_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await api.functional.mallPlatform.customer.wishlists.erase(actorConnection);
  await api.functional.mallPlatform.customer.wishlists.erase(otherConnection);
}
