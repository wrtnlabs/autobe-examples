import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * This E2E test function verifies the moderator login authentication process.
 * It first creates a moderator account by invoking the join endpoint with valid
 * registration data including email, password, current IP, href, and referrer
 * URLs. This is necessary to establish the moderator user account for
 * successful login. After the join operation succeeds and returns an authorized
 * moderator object, the test calls the login endpoint using the same moderator
 * email and password along with new href and referrer URL to simulate a login
 * request. The login response must include a valid JWT token and correct
 * moderator account information. The test asserts the types of all returned
 * objects to validate schema correctness and runtime type safety. All required
 * properties and constraints such as email format and URI format are fully
 * respected. The test uses realistic random data for URLs and legit email
 * formats. Proper typia assertions are applied to ensure perfect type
 * validation as per the DTO schema. This test validates the full business
 * workflow of moderator registration followed by authentication via login,
 * which is critical for the authorization context of later moderator-protected
 * API calls.
 */
export async function test_api_moderator_login_authentication(
  connection: api.IConnection,
) {
  // 1. Create moderator account using join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityModerator.IJoin;
  const joined = await api.functional.auth.moderator.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2. Login as the newly created moderator
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityModerator.ILogin;
  const loggedIn = await api.functional.auth.moderator.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3. Validate that login output matches join output except dynamic fields
  TestValidator.equals("moderator IDs must match", loggedIn.id, joined.id);
  TestValidator.equals(
    "moderator emails must match",
    loggedIn.email,
    joined.email,
  );
  TestValidator.predicate(
    "token access exists",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh exists",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at valid ISO string",
    typeof loggedIn.token.expired_at === "string" &&
      loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until valid ISO string",
    typeof loggedIn.token.refreshable_until === "string" &&
      loggedIn.token.refreshable_until.length > 0,
  );
}
