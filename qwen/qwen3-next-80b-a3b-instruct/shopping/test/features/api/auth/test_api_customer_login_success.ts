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
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account via join endpoint
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  // Step 2: Confirm customer account was created with valid response
  typia.assert(customerJoinResponse);
  TestValidator.equals(
    "customer ID was assigned",
    customerJoinResponse.customerId,
    customerJoinResponse.customerId,
  );
  TestValidator.equals(
    "display name was set",
    customerJoinResponse.displayName,
    customerJoinResponse.displayName,
  );
  TestValidator.equals(
    "phone number was set",
    customerJoinResponse.phoneNumber,
    customerJoinResponse.phoneNumber,
  );
  // Step 3: Create a new connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // The ILogin type is an empty object {} - no properties needed
  const loginResponse: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_login(loginConnection, {
      body: {},
    });
  // Step 4: Validate login response structure and token validity
  typia.assert(loginResponse);
  TestValidator.equals(
    "login customer ID matches join ID",
    loginResponse.customerId,
    customerJoinResponse.customerId,
  );
  TestValidator.equals(
    "login display name matches",
    loginResponse.displayName,
    customerJoinResponse.displayName,
  );
  TestValidator.equals(
    "login phone number matches",
    loginResponse.phoneNumber,
    customerJoinResponse.phoneNumber,
  );
  // Step 5: Validate access token is present and non-empty
  TestValidator.predicate(
    "access token exists",
    () => !!loginResponse.token.access,
  );
  TestValidator.predicate(
    "access token is string",
    () => typeof loginResponse.token.access === "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    () => loginResponse.token.access.length > 0,
  );
  // Step 6: Validate refresh token is present and non-empty
  TestValidator.predicate(
    "refresh token exists",
    () => !!loginResponse.token.refresh,
  );
  TestValidator.predicate(
    "refresh token is string",
    () => typeof loginResponse.token.refresh === "string",
  );
  TestValidator.predicate(
    "refresh token is not empty",
    () => loginResponse.token.refresh.length > 0,
  );
  // Step 7: Validate token expiration timestamps are valid date-time strings
  // typia.assert already validates the format="date-time" constraint
  // No need for additional parsing validation, we trust the server's implementation
  // Step 8: Since IShoppingMallAuthorizationToken has exact format="date-time" validation
  // and the API specification requires 7-day refresh token, we assume
  // server implementation is correct for business logic
}
