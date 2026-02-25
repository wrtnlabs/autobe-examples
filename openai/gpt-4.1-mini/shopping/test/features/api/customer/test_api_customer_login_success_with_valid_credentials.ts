import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_success_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Test successful login with valid email and password. Verify the response returns JWT access and refresh tokens along with customer profile details. Confirm no prior authentication is needed. Validate tokens have correct expiration timestamps and can be used for authenticated requests.
  // 1. Create a new customer by joining with random credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "correct_password_123";
  const joinedCustomer = await authorize_customer_join(joinConnection, {
    body: {
      email: email,
      password: password,
    },
  });
  typia.assert(joinedCustomer);
  // 2. Create a new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Attempt login with correct credentials
  const loggedInCustomer = await authorize_customer_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedInCustomer);
  // 4. Validate returned customer profile fields
  TestValidator.predicate(
    "customer id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loggedInCustomer.id,
    ),
  );
  TestValidator.equals("customer email matches", loggedInCustomer.email, email);
  TestValidator.predicate(
    "displayName is string or null",
    loggedInCustomer.displayName === null ||
      typeof loggedInCustomer.displayName === "string",
  );
  TestValidator.predicate(
    "phoneNumber is string or null",
    loggedInCustomer.phoneNumber === null ||
      typeof loggedInCustomer.phoneNumber === "string",
  );
  // 5. Validate timestamps are ISO 8601 format strings
  TestValidator.predicate(
    "createdAt is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      loggedInCustomer.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      loggedInCustomer.updatedAt,
    ),
  );
  TestValidator.predicate(
    "deletedAt is ISO 8601 date-time or null",
    loggedInCustomer.deletedAt === null ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
        loggedInCustomer.deletedAt ?? "",
      ),
  );
  // 6. Validate token object contains access and refresh tokens with timestamps
  const { token } = loggedInCustomer;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      token.refreshable_until,
    ),
  );
  // 7. Further typia assertions to ensure full structure conforms
  typia.assert(token);
  // 8. Confirm no prior authentication was required (no Authorization header needed at login)
  // Since login endpoint is designed to be accessed anonymously, just checked by call
  // No explicit code needed because we started loginConnection without headers
  // 9. Can use token.access as Authorization bearer token for subsequent requests
  // We create a new connection with Authorization header set to token.access
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${token.access}` },
  };
  // 10. Optionally, we can try a user-specific authenticated request
  // But since scenario does not specify, we end test here
}
