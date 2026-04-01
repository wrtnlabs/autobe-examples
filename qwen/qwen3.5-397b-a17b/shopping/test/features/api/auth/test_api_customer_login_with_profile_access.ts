import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_with_profile_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate login response contains valid JWT tokens
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is in future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  // 4. Validate customer profile information exists and is complete
  TestValidator.predicate(
    "profile has display name",
    loginResult.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has phone number",
    loginResult.profile.phone_number.length > 0,
  );
  TestValidator.predicate(
    "profile has valid id",
    /^[0-9a-f-]{36}$/i.test(loginResult.profile.id),
  );
  TestValidator.predicate(
    "profile created_at is valid date",
    !isNaN(Date.parse(loginResult.profile.created_at)),
  );
  TestValidator.predicate(
    "profile updated_at is valid date",
    !isNaN(Date.parse(loginResult.profile.updated_at)),
  );
  // 5. Validate customer identity consistency between join and login
  TestValidator.equals("customer id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  // 6. Validate profile customer relation exists
  TestValidator.predicate(
    "profile customer exists",
    loginResult.profile.customer !== null,
  );
  TestValidator.equals(
    "profile customer id matches",
    loginResult.profile.customer.id,
    loginResult.id,
  );
  TestValidator.equals(
    "profile customer email matches",
    loginResult.profile.customer.email,
    loginResult.email,
  );
}
