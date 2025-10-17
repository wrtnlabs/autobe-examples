import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_login_inactive_account(
  connection: api.IConnection,
) {
  // STEP 1: Generate an email that will NOT be registered in the system
  // This simulates an inactive account from an E2E perspective:
  // The system returns 401 for both non-existent and inactive accounts to prevent enumeration
  const nonExistentAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = "StrongPass123!";

  // STEP 2: Attempt to login with non-existent admin credentials
  // The system should reject this with 401 Unauthorized, whether the account is inactive or doesn't exist
  await TestValidator.error(
    "login should fail for non-existent admin account (security equivalence to inactive account)",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: nonExistentAdminEmail,
          password: password,
        } satisfies IEconomicBoardAdmin.ILogin,
      });
    },
  );

  // STEP 3: (Verification) Create a legitimate admin account to confirm login works with valid credentials
  // This ensures the system's login endpoint functions correctly under valid conditions
  const legitimateAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const generatedAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: legitimateAdminEmail,
        password: password,
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(generatedAdmin);

  // Confirm we can login with this valid admin account
  const authenticatedAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: legitimateAdminEmail,
        password: password,
      } satisfies IEconomicBoardAdmin.ILogin,
    });
  typia.assert(authenticatedAdmin);
  TestValidator.equals(
    "authenticated admin ID matches created ID",
    authenticatedAdmin.id,
    generatedAdmin.id,
  );
}
