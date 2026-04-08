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
 * Test customer wishlist item removal for the authenticated owner.
 *
 * Verifies that a signed-in customer can invoke the wishlist item deletion endpoint using an actor-specific authenticated connection. The scenario follows the required connection isolation pattern and confirms that the delete call completes successfully with a valid wishlist item identifier.
 *
 * Because no wishlist listing or detail DTOs are available in the provided SDK surface, the test cannot inspect post-deletion wishlist state without inventing unsupported APIs. Instead, it validates the supported happy-path deletion flow while keeping the customer account registration and authorization steps realistic.
 *
 * 1. Register and authenticate a customer with the provided join utility.
 * 2. Create an isolated customer connection derived from the base host.
 * 3. Delete a wishlist item using a valid UUID path parameter.
 */
export async function test_api_customer_wishlist_item_removal(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/mall/customer/wishlists",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await api.functional.mallPlatform.customer.wishlists.items.erase(
    customerConnection,
    {
      wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
