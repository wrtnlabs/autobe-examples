import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super admin account for testing
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  // Use base connection for join - it will be updated with auth header
  const baseConnection: api.IConnection = { host: connection.host };
  const registeredAdmin =
    await api.functional.discussionBoard.auth.superAdmin.join(baseConnection, {
      body: joinInput,
    });
  typia.assert(registeredAdmin);
  // Test successful login with the created admin account
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse =
    await api.functional.discussionBoard.auth.superAdmin.login(
      loginConnection,
      {
        body: loginInput,
      },
    );
  typia.assert(loginResponse);
  // Validate response structure
  TestValidator.equals("response has id", typeof loginResponse.id, "string");
  TestValidator.equals(
    "response has email",
    typeof loginResponse.email,
    "string",
  );
  // Fix: Use an arrow function that takes no parameters and references display_name directly
  await TestValidator.predicate(
    "response has display_name (string or null)",
    () => loginResponse.display_name === null || typeof loginResponse.display_name === "string",
  );
  TestValidator.equals(
    "response has token",
    typeof loginResponse.token,
    "object",
  );
  TestValidator.equals(
    "response has authorizationActor",
    loginResponse.authorizationActor,
    "superAdmin",
  );
  // Validate token structure
  const token = loginResponse.token;
  TestValidator.equals("token has access", typeof token.access, "string");
  TestValidator.equals("token has refresh", typeof token.refresh, "string");
  TestValidator.equals(
    "token has expired_at",
    typeof token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refreshable_until",
    typeof token.refreshable_until,
    "string",
  );
  // Validate email matches
  TestValidator.equals(
    "email matches login input",
    loginResponse.email,
    joinInput.email,
  );
  // Validate token is valid and can be used for authenticated requests
  // The login function automatically sets the access token in connection.headers
  TestValidator.notEquals("access token is not empty", token.access, "");
  TestValidator.predicate("authorization header is set after login", () => {
    return (
      loginConnection.headers !== undefined &&
      loginConnection.headers.Authorization === token.access
    );
  });
}