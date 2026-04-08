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
 * Test customer profile update for the signed-in account.
 *
 * Verifies that a customer can register, authenticate, and update the profile
 * display name and phone number through the authenticated profile endpoint.
 * The response is validated to ensure the profile remains bound to the same
 * customer account and reflects the new profile values returned by the server.
 *
 * 1. Register a new customer account.
 * 2. Reuse the authenticated session to update the profile.
 * 3. Validate the updated profile response and account association.
 */
export async function test_api_customer_profile_update(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const output = await api.functional.mallPlatform.customer.profile.update(
    customerConnection,
    {
      body: {
        displayName,
        phoneNumber,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "profile customer id should remain the same",
    output.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "profile customer email should remain the same",
    output.customer.email,
    joined.email,
  );
  TestValidator.equals(
    "updated display name should match request",
    output.displayName,
    displayName,
  );
  TestValidator.equals(
    "updated phone number should match request",
    output.phoneNumber,
    phoneNumber,
  );
  TestValidator.equals(
    "profile belongs to signed-in customer",
    output.customer.id,
    joined.id,
  );
  TestValidator.equals(
    "profile customer status should remain active",
    output.customer.status,
    joined.status,
  );
}
