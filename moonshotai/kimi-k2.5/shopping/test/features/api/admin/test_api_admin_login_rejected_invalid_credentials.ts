import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_rejected_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create an active administrator account with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  // Attempt login with incorrect password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  let wrongPasswordError: api.HttpError | undefined;
  try {
    await authorize_admin_login(wrongPasswordConnection, {
      body: {
        email,
        password: "WrongPassword123!",
      } satisfies IEcommerceMallAdmin.ILogin,
    });
    throw new Error(
      "Expected login with wrong password to fail but it succeeded",
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      wrongPasswordError = error;
    } else {
      throw error;
    }
  }
  // Attempt login with non-existent email
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentConnection: api.IConnection = { host: connection.host };
  let nonExistentError: api.HttpError | undefined;
  try {
    await authorize_admin_login(nonExistentConnection, {
      body: {
        email: nonExistentEmail,
        password,
      } satisfies IEcommerceMallAdmin.ILogin,
    });
    throw new Error(
      "Expected login with non-existent email to fail but it succeeded",
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      nonExistentError = error;
    } else {
      throw error;
    }
  }
  // Verify same error response to prevent account enumeration attacks
  TestValidator.equals(
    "HTTP error status codes match",
    wrongPasswordError.status,
    nonExistentError.status,
  );
  TestValidator.equals(
    "Error messages match",
    wrongPasswordError.message,
    nonExistentError.message,
  );
}
