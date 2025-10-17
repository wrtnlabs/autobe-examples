import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Create admin account for invalid login testing
  const adminAccount: IEconomicBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
  } satisfies IEconomicBoardAdmin.IJoin;

  const createdAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAccount,
    });
  typia.assert(createdAdmin);

  // Test admin login with incorrect password
  await TestValidator.error(
    "admin login with incorrect password should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: createdAdmin.email,
          password: "WrongPassword123!", // Incorrect password
        } satisfies IEconomicBoardAdmin.ILogin,
      });
    },
  );

  // Verify that the admin account still exists and can be logged in with correct password
  const validLogin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: createdAdmin.email,
        password: "ValidPassword123!", // Correct password
      } satisfies IEconomicBoardAdmin.ILogin,
    });
  typia.assert(validLogin);
  TestValidator.equals(
    "admin ID should match created admin",
    createdAdmin.id,
    validLogin.id,
  );
}
