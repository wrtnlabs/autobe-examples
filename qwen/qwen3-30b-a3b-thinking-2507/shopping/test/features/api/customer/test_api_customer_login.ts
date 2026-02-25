import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for authentication test
  const customerConnection: api.IConnection = { host: connection.host };
  const signupPassword = RandomGenerator.alphaNumeric(16);
  const signupResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: signupPassword,
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(signupResponse);
  // 2. Login with customer credentials
  const loginResponse = await authorize_customer_login(connection, {
    body: {
      email: signupResponse.email,
      password: signupPassword,
    } satisfies IEcommerceCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Verify response structure
  TestValidator.equals(
    "customer ID present",
    loginResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "email matches input",
    loginResponse.email,
    signupResponse.email,
  );
  TestValidator.equals(
    "token access present",
    loginResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "is_suspended is false",
    loginResponse.is_suspended,
    false,
  );
  TestValidator.equals(
    "email_verified is true",
    loginResponse.email_verified,
    true,
  );
}
