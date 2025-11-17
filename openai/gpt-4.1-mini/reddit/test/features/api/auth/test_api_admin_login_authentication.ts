import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

export async function test_api_admin_login_authentication(
  connection: api.IConnection,
) {
  // 1. Create a new admin account by joining
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: "securePassword123", // Fixed password for deterministic login
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
  } satisfies IRedditCommunityAdmin.IJoin;

  const joinedAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Authenticate the admin by logging in
  const loginBody = {
    username: adminEmail, // Use same email as username
    password: "securePassword123",
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityAdmin.ILogin;

  const loggedInAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Validate that the logged-in admin id matches the joined admin id
  TestValidator.equals(
    "admin ID after login matches that after join",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  // Validate that token properties exist and are strings with expected format
  TestValidator.predicate(
    "login token access is a non-empty string",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh is a non-empty string",
    typeof loggedInAdmin.token.refresh === "string" &&
      loggedInAdmin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login token expired_at is a valid ISO date-time string",
    typeof loggedInAdmin.token.expired_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
        loggedInAdmin.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "login token refreshable_until is a valid ISO date-time string",
    typeof loggedInAdmin.token.refreshable_until === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
        loggedInAdmin.token.refreshable_until,
      ),
  );
}
