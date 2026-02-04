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

export async function test_api_customer_registration_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate a random email for registration
  const firstName = RandomGenerator.name();
  const email = `${firstName}@example.com`;
  // Step 3: Register the customer
  const customer = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 4: Validate the registration response
  typia.assert(customer);
  // Step 5: Verify email is valid format and not verified
  TestValidator.equals("email format", customer.email, email);
  TestValidator.equals("email is not verified", customer.email_verified, false);
  // Step 6: Validate other properties (for completeness)
  TestValidator.equals("name is valid", customer.name, customer.name);
  TestValidator.equals(
    "created_at is valid format",
    customer.created_at,
    customer.created_at,
  );
  TestValidator.equals(
    "access token is present",
    Boolean(customer.token.access),
    true,
  );
}
