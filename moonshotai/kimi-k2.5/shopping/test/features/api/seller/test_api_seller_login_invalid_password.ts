import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account for testing wrong password scenario
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123!";
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: correctPassword,
    },
  });
  // 2. Test login with incorrect password - should return 401
  let wrongPasswordError: api.HttpError | undefined;
  try {
    const wrongPasswordConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(wrongPasswordConnection, {
      body: {
        email: sellerEmail,
        password: "WrongPassword456!",
      } satisfies IEcommerceMallSeller.ILogin,
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      wrongPasswordError = error;
    }
  }
  // 3. Verify 401 status for wrong password
  TestValidator.predicate(
    "wrong password returns 401",
    wrongPasswordError !== undefined && wrongPasswordError.status === 401,
  );
  typia.assertGuard(wrongPasswordError!);
  // 4. Test login with non-existent email - should also return 401
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  let nonExistentError: api.HttpError | undefined;
  try {
    const nonExistentConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(nonExistentConnection, {
      body: {
        email: nonExistentEmail,
        password: "AnyPassword123!",
      } satisfies IEcommerceMallSeller.ILogin,
    });
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      nonExistentError = error;
    }
  }
  // 5. Verify 401 status for non-existent email
  TestValidator.predicate(
    "non-existent email returns 401",
    nonExistentError !== undefined && nonExistentError.status === 401,
  );
  typia.assertGuard(nonExistentError!);
  // 6. Verify error responses are identical (no account enumeration leakage)
  // Compare status codes
  TestValidator.equals(
    "error status codes are identical",
    wrongPasswordError.status,
    nonExistentError.status,
  );
  // Compare error messages to ensure no information leakage
  TestValidator.equals(
    "error messages are identical (no account enumeration)",
    wrongPasswordError.toJSON().message,
    nonExistentError.toJSON().message,
  );
}
