import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate valid customer registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";
  // Step 2: Create a new connection for the registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 3: Register the new customer using the authorization utility
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    },
  });
  // Step 4: Validate the registration response
  typia.assert<IShoppingMallCustomer.IAuthorized>(registeredCustomer);
  // Step 5: Validate customer identity fields
  TestValidator.equals(
    "customer ID is valid UUID",
    registeredCustomer.customerId,
    registeredCustomer.customerId,
  );
  TestValidator.equals(
    "display name is string",
    typeof registeredCustomer.displayName,
    "string",
  );
  TestValidator.equals(
    "phone number is string",
    typeof registeredCustomer.phoneNumber,
    "string",
  );
  // Step 6: Validate token structure and types
  typia.assert<IShoppingMallAuthorizationToken>(registeredCustomer.token);
  TestValidator.equals(
    "access token is string",
    typeof registeredCustomer.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof registeredCustomer.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is ISO date-time format",
    registeredCustomer.token.expired_at,
    registeredCustomer.token.expired_at,
  );
  TestValidator.equals(
    "refreshable_until is ISO date-time format",
    registeredCustomer.token.refreshable_until,
    registeredCustomer.token.refreshable_until,
  );
}
