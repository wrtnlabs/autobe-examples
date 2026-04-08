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

export async function test_api_customer_wishlist_item_owner_only_deletion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that wishlist item deletion is restricted to the owning customer.
   *
   * This scenario exercises the authorization rule for customer wishlist-item
   * removal. It creates two separate authenticated customer sessions and attempts
   * to delete a wishlist item identifier using the second customer's credentials.
   * The test confirms the request is rejected by the platform's ownership checks.
   *
   * 1. Register and authenticate the first customer session.
   * 2. Register and authenticate the second customer session.
   * 3. Attempt to delete a syntactically valid wishlist item identifier as the
   *    non-owning customer.
   * 4. Confirm the request is rejected with an authorization-style error.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  await TestValidator.httpError(
    "non-owning customer cannot delete a wishlist item",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.items.erase(
        intruderConnection,
        {
          wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
