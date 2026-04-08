import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Ensure a customer cannot retrieve another customer's saved shipping address.
 *
 * Verifies that shipping-address lookup is strictly scoped to the authenticated
 * customer context and that an inaccessible address identifier returns a
 * not-found response without exposing address details.
 *
 * Because the available API surface does not include a shipping-address create
 * endpoint, the test uses two authenticated customer actors and probes the
 * protected retrieval endpoint with an inaccessible UUID to validate the
 * platform's ownership enforcement and not-found behavior.
 *
 * 1. Authenticate two separate customer accounts.
 * 2. Attempt to retrieve a shipping address through the second customer with an
 *    inaccessible identifier.
 * 3. Assert that the API responds with a 404 not-found error.
 */
export async function test_api_shipping_address_retrieve_other_customers_address_not_found(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "retrieving another customer's shipping address should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.at(
        intruderConnection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
