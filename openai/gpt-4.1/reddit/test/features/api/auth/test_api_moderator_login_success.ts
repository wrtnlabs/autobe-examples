import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Verify that a moderator can authenticate with valid credentials. Steps:
 *
 * 1. Register a new moderator with the join endpoint to get unique test
 *    credentials and ID.
 * 2. Attempt to log in with the same email and password, providing matching
 *    context fields (href, referrer, ip).
 * 3. Check that an authorized profile and valid token are returned, that IDs match
 *    between the join and login responses, and that no sensitive data is
 *    exposed.
 * 4. Validate that the returned session token grants appropriate privileges.
 */
export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // 1. Register new moderator to get credentials and ID.
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/start";
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const status = "active";
  const business_status = null;
  const joinPayload = {
    email,
    password,
    status,
    business_status,
    href,
    referrer,
    ip,
  } satisfies ICommunityPlatformModerator.ICreate;

  const joinResp = await api.functional.auth.moderator.join(connection, {
    body: joinPayload,
  });
  typia.assert(joinResp);

  // 2. Attempt login with the same credentials and context.
  const loginPayload = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ICommunityPlatformModerator.ILogin;
  const loginResp = await api.functional.auth.moderator.login(connection, {
    body: loginPayload,
  });
  typia.assert(loginResp);

  // 3. Check that response contains valid moderator profile, correct ID, and safe token structure.
  TestValidator.equals(
    "login moderator id matches registered id",
    loginResp.id,
    joinResp.id,
  );
  TestValidator.equals(
    "login moderator email matches registered",
    loginResp.email,
    email,
  );
  TestValidator.equals(
    "login moderator status matches registration",
    loginResp.status,
    status,
  );
  TestValidator.equals(
    "login moderator business_status matches registration",
    loginResp.business_status,
    business_status,
  );
  TestValidator.predicate(
    "JWT token structure is present on login",
    typeof loginResp.token === "object" &&
      loginResp.token !== null &&
      typeof loginResp.token.access === "string" &&
      typeof loginResp.token.refresh === "string" &&
      typeof loginResp.token.expired_at === "string" &&
      typeof loginResp.token.refreshable_until === "string",
  );
  TestValidator.predicate(
    "login response contains no password field",
    !("password" in loginResp),
  );

  // 4. Validate that join and login both omit passwords/sensitive info.
  TestValidator.predicate(
    "join response contains no password",
    !("password" in joinResp),
  );
  TestValidator.predicate(
    "joined moderator token has proper structure",
    typeof joinResp.token === "object" &&
      joinResp.token !== null &&
      typeof joinResp.token.access === "string" &&
      typeof joinResp.token.refresh === "string" &&
      typeof joinResp.token.expired_at === "string" &&
      typeof joinResp.token.refreshable_until === "string",
  );
}
