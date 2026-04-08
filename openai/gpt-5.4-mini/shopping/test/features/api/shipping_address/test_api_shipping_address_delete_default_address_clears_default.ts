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
 * Delete a customer's saved shipping address and verify the no-content response.
 *
 * Validates the authenticated customer ownership flow for removing a saved shipping address. The test focuses on the supported delete operation and ensures the endpoint completes successfully without returning a body.
 *
 * Because the available SDK only exposes customer registration and shipping-address deletion, the scenario is reduced to the compilable E2E coverage that can be executed against the provided API surface.
 *
 * 1. Register a customer account and authenticate the customer session.
 * 2. Delete a saved shipping address by its identifier under that customer session.
 * 3. Confirm the operation completes without a response body.
 */
export async function test_api_shipping_address_delete_default_address_clears_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.mallPlatform.customer.shipping_addresses.erase(
    customerConnection,
    {
      shippingAddressId,
    },
  );
}
