import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_login_non_existing_email(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test the administrator login API with a non-existing email address.
  // The test attempts to login using an unregistered email and a valid password.
  // It should verify that the login fails with an explicit error message denying access.
  // Prepare a random email address that is very unlikely to exist
  const nonExistingEmail = `nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`;
  // Generate a valid password string
  const validPassword = `Password123!`;
  // Create a new connection object for administrator login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  // Attempt to login with the non-existing email and valid password
  await TestValidator.error(
    "administrator login with non-existing email should fail",
    async () => {
      await authorize_administrator_login(adminLoginConnection, {
        body: {
          email: nonExistingEmail,
          password: validPassword,
        } satisfies IDiscussionBoardAdministrator.ILogin,
      });
    },
  );
}
