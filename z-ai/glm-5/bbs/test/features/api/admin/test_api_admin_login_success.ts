import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 *
 * This test validates the complete authentication flow for an administrator
 * who provides correct email and password credentials. It verifies that:
 * 1. An administrator account can be created successfully
 * 2. The login endpoint authenticates valid credentials
 * 3. The response contains valid JWT tokens and administrator profile
 * 4. Account status fields indicate an active, non-banned account
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for the test administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create a new administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with the created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Verify administrator profile matches input credentials
  TestValidator.equals("email matches input", loginResult.email, adminEmail);
  // Step 4: Verify account status - new account should not be banned or deleted
  TestValidator.equals("bannedAt is null", loginResult.bannedAt, null);
  TestValidator.equals("deletedAt is null", loginResult.deletedAt, null);
  // Step 5: Verify default grade for new administrators
  TestValidator.equals("grade is regular", loginResult.grade, "regular");
  // Step 6: Verify JWT tokens are present and connection is authorized
  TestValidator.predicate(
    "connection has authorization token",
    typeof loginConnection.headers?.Authorization === "string" &&
      loginConnection.headers.Authorization.length > 0,
  );
}