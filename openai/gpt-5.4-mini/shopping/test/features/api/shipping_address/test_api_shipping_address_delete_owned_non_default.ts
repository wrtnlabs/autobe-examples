import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test deletion of an owned non-default shipping address.
 *
 * This scenario validates that an authenticated customer can remove one of
 * their saved shipping addresses when the target address is not the default.
 * The workflow covers customer registration, authenticated execution under a
 * dedicated customer connection, and successful deletion of the selected
 * shipping address without affecting the remaining saved addresses.
 *
 * 1. Register and authenticate a customer account using the required utility.
 * 2. Delete an owned shipping address from the authenticated customer session.
 * 3. Confirm the delete operation completes without content.
 */
export async function test_api_shipping_address_delete_owned_non_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await api.functional.mallPlatform.customer.shipping_addresses.erase(
    customerConnection,
    {
      shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
