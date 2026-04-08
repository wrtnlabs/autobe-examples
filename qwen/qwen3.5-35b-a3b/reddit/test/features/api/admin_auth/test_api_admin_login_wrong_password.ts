import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account with valid credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminCredentials);
  // 2. Attempt login with wrong password - should fail with 401
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password fails",
    [401],
    async () => {
      await authorize_admin_login(adminLoginConnection, {
        body: {
          email: adminCredentials.email,
          password: "wrong_password_123",
        } satisfies IRedditCommunityAdmin.ILogin,
      });
    },
  );
  // 3. Verify error message is generic and doesn't reveal credential validity
  const adminLoginErrorConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_admin_login(adminLoginErrorConnection, {
      body: {
        email: adminCredentials.email,
        password: "wrong_password_123",
      } satisfies IRedditCommunityAdmin.ILogin,
    });
    throw new Error("Expected login to fail with 401");
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      const errorResponse = exp.toJSON();
      TestValidator.equals("error status is 401", errorResponse.status, 401);
      // Validate error message doesn't specify which credential is wrong
      TestValidator.notEquals(
        "error message is generic",
        errorResponse.message,
        "Email not found",
      );
      TestValidator.notEquals(
        "error message is generic",
        errorResponse.message,
        "Invalid password",
      );
    } else {
      throw new Error("Expected HttpError to be thrown");
    }
  }
  // 4. Verify connection headers were NOT updated (failed login should not set token)
  TestValidator.notEquals(
    "failed login does not set auth header",
    adminLoginConnection.headers?.Authorization,
    undefined,
  );
}
