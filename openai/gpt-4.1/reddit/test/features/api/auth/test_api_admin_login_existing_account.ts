import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Test successful authentication for a verified and non-deleted admin account.
 *
 * This test ensures that a valid, fresh admin account can successfully log in
 * and receive session tokens. It covers:
 *
 * 1. Registering a new admin account to guarantee uniqueness
 * 2. (Implicit in this E2E: The new admin account is already verified; there are
 *    no verification APIs exposed)
 * 3. Performing a login using the registered credentials
 * 4. Verifying the presence and correctness of issued JWT tokens and session
 *    context
 * 5. Excluding error and negative-edge flows such as unverified accounts or
 *    deleted admin accounts
 *
 * The join and login flows include href/referrer audit context, per DTO
 * contract.
 */
export async function test_api_admin_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (ensures uniqueness and known credentials)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const displayName: string = RandomGenerator.name();
  const href: string = "https://platform-admin.test/register";
  const referrer: string = "https://platform-admin.test/";

  const joinResult: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string & tags.MinLength<8>,
        display_name: displayName satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<80>,
        href,
        referrer,
        ip: undefined,
      },
    });
  typia.assert(joinResult);

  // 2. Immediately login with the registered credentials (account is assumed verified upon join)
  const loginResult: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string & tags.Format<"password">,
        href: "https://platform-admin.test/login",
        referrer: "https://platform-admin.test/",
        ip: undefined,
      },
    });
  typia.assert(loginResult);

  // 3. Verify the contents of the issued JWT tokens and session context
  TestValidator.equals(
    "token object issued on login",
    typeof loginResult.token,
    "object",
  );
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time format",
    typeof loginResult.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        loginResult.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time format",
    typeof loginResult.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        loginResult.token.refreshable_until,
      ),
  );
  TestValidator.predicate(
    "login result id is UUID",
    typeof loginResult.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        loginResult.id,
      ),
  );
  TestValidator.equals(
    "login email matches registered admin",
    loginResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "login display_name matches registration",
    loginResult.display_name,
    displayName,
  );
  TestValidator.equals(
    "deleted_at is not set after login",
    loginResult.deleted_at,
    null,
  );
}
