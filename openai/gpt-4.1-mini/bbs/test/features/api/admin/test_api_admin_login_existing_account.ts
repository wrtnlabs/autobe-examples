import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Create new admin account with join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongPassword123!";
  const adminDisplayName = RandomGenerator.name();

  const adminAccount: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAccount);

  // 2. Validate join response
  TestValidator.equals("joined admin email", adminAccount.email, adminEmail);
  TestValidator.equals(
    "joined admin displayName",
    adminAccount.display_name,
    adminDisplayName,
  );
  TestValidator.predicate(
    "joined admin has token",
    adminAccount.token !== null && adminAccount.token !== undefined,
  );
  typia.assert<IAuthorizationToken>(adminAccount.token);

  // 3. Perform login using same credentials
  const loginResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // 4. Validate login response token and properties
  TestValidator.equals("login admin email", loginResponse.email, adminEmail);
  TestValidator.equals(
    "login admin displayName",
    loginResponse.display_name,
    adminDisplayName,
  );
  TestValidator.predicate(
    "login admin has token",
    loginResponse.token !== null && loginResponse.token !== undefined,
  );
  typia.assert<IAuthorizationToken>(loginResponse.token);
}
