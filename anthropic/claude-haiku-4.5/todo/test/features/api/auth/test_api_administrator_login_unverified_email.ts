import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_administrator_login_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account through the join endpoint
  // This creates the account but leaves email_verified as false since
  // email verification is required before the account can be used
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";

  const joinResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IAdministratorRegistrationRequest,
    });
  typia.assert(joinResponse);

  // Step 2: Attempt to log in with the newly created but unverified account
  // The system should reject the login with 403 Forbidden because
  // email_verified flag is false, indicating email verification is mandatory
  await TestValidator.error(
    "login should fail when email is not verified",
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies IAdministratorLoginRequest,
      });
    },
  );
}
