import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test the admin login process involving authentication with valid email and
 * password.
 *
 * This test validates the full business workflow by first creating an admin
 * account with a randomly generated UUID as user_id. It then logs in with the
 * created admin's email, password, and simulated navigation URLs (href and
 * referrer).
 *
 * The test asserts that the creation and login operations succeed by verifying
 * matching user and admin IDs and utilizes typia.assert to enforce runtime type
 * safety validation of all API responses.
 */
export async function test_api_admin_login_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new admin account by providing a valid user_id (UUID)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const adminCreateBody = {
    user_id: userId,
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  TestValidator.equals(
    "admin creation user_id",
    adminAuthorized.user_id,
    userId,
  );

  // 2. Login as admin using the created admin's user email and a generated password
  if (adminAuthorized.user === undefined) {
    throw new Error("Missing user summary in adminAuthorized response.");
  }
  const loginBody = {
    email: adminAuthorized.user.email,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.ILogin;

  const loginAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  TestValidator.equals(
    "login admin id",
    loginAuthorized.id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "login user id",
    loginAuthorized.user_id,
    adminAuthorized.user_id,
  );
}
