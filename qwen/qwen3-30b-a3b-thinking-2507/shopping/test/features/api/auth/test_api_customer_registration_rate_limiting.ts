import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Validates the registration rate limit security mechanism prevents brute force attacks.
 *
 * Tests that 5 registration attempts are allowed within a 5 minute window from the
 * same IP address, while the 6th registration attempt fails due to exceeding the rate
 * limit. This ensures the registration endpoint properly implements security against
 * brute force registration attempts while allowing legitimate customer signups.
 */
export async function test_api_customer_registration_rate_limiting(
  connection: api.IConnection,
) {
  // Create a new isolation connection for customer operations
  const customerConnection: api.IConnection = { host: connection.host };
  // Attempt 5 valid registrations to reach the rate limit threshold
  for (let i = 0; i < 5; i++) {
    // Register a customer with the empty registration input (IJoin is empty in DTO)
    const customer = await authorize_customer_join(customerConnection, {
      body: {} as IShoppingMallCustomer.IJoin,
    });
    // Validate the successful registration response structure
    typia.assert(customer);
  }
  // Attempt 6th registration which should exceed the rate limit
  await TestValidator.error(
    "Rate limit exceeded for registration attempts",
    async () => {
      await authorize_customer_join(customerConnection, {
        body: {} as IShoppingMallCustomer.IJoin,
      });
    },
  );
}
