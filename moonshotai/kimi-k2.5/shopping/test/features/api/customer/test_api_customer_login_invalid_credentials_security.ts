import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_invalid_credentials_security(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid customer account to test against
  const joinConnection: api.IConnection = { host: connection.host };
  const validPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: validPassword,
    },
  });
  typia.assert(customer);
  // Step 2: Attempt login with non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  let nonExistentEmailError: api.HttpError | null = null;
  try {
    await api.functional.ecommerceMall.auth.customer.login(
      { host: connection.host },
      {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCustomer.ILogin,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      nonExistentEmailError = error;
    }
  }
  // Step 3: Attempt login with correct email but wrong password
  let wrongPasswordError: api.HttpError | null = null;
  try {
    await api.functional.ecommerceMall.auth.customer.login(
      { host: connection.host },
      {
        body: {
          email: customer.email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCustomer.ILogin,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      wrongPasswordError = error;
    }
  }
  // Step 4: Verify both attempts return 401 Unauthorized
  TestValidator.predicate(
    "non-existent email returns 401",
    nonExistentEmailError !== null && nonExistentEmailError.status === 401,
  );
  TestValidator.predicate(
    "wrong password returns 401",
    wrongPasswordError !== null && wrongPasswordError.status === 401,
  );
  // Step 5: Verify error messages are consistent (prevent account enumeration)
  TestValidator.equals(
    "error messages consistent for security",
    nonExistentEmailError?.message,
    wrongPasswordError?.message,
  );
}
