import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResponse = await api.functional.ecommerceMall.auth.customer.join(
    connection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Store the registered customer ID for later comparison
  const registeredCustomerId = joinResponse.id;
  // 2. Login with the same credentials
  const loginResponse = await api.functional.ecommerceMall.auth.customer.login(
    connection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Validate the login response
  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  // Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(loginResponse.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      loginResponse.token.refreshable_until,
    ),
  );
  // Verify customer ID matches registered account
  TestValidator.equals(
    "customer ID matches registered account",
    loginResponse.id,
    registeredCustomerId,
  );
  // Verify customer profile is present with display name
  TestValidator.predicate(
    "profile exists",
    loginResponse.profile !== null && loginResponse.profile !== undefined,
  );
  TestValidator.predicate(
    "display name is non-empty",
    loginResponse.profile.displayName.length > 0,
  );
  // Verify email matches
  TestValidator.equals("email matches", loginResponse.email, email);
  // Verify empty shipping addresses for new account
  TestValidator.equals(
    "addresses array is empty",
    loginResponse.addresses,
    [] as IEcommerceMallShippingAddress.ISummary[],
  );
}
