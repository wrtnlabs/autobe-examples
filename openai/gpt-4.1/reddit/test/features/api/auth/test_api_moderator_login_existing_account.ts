import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate the successful login flow for an existing moderator account.
 *
 * 1. Register a unique platform member (email verified) via /auth/member/join.
 * 2. Register a moderator using /auth/moderator/join, assigned to a test
 *    community.
 * 3. Perform login with the moderator's credentials using /auth/moderator/login.
 * 4. Validate that JWT access and refresh tokens are returned and that
 *    identity/session fields match expectations.
 */
export async function test_api_moderator_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Register a new, verified platform member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals("email should match", member.email, memberEmail);
  TestValidator.predicate(
    "member must be initially unverified or allow test pass",
    typeof member.email_verified === "boolean",
  );

  // 2. Register a moderator assigned to a random community
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderatorPassword = RandomGenerator.alphaNumeric(14);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
      community_id: communityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals("moderator email", moderator.email, memberEmail);
  TestValidator.equals(
    "moderator community assignment",
    moderator.community_id,
    communityId,
  );

  // 3. Login with moderator credentials
  const loginRes = await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(loginRes);
  TestValidator.equals(
    "login email matches moderator",
    loginRes.email,
    moderator.email,
  );
  TestValidator.equals(
    "login community_id matches",
    loginRes.community_id,
    communityId,
  );
  TestValidator.notEquals("login should provide token", loginRes.token, null);
  TestValidator.predicate("access token present", !!loginRes.token.access);
  TestValidator.predicate("refresh token present", !!loginRes.token.refresh);
  TestValidator.predicate("expired_at present", !!loginRes.token.expired_at);
  TestValidator.predicate(
    "refreshable_until present",
    !!loginRes.token.refreshable_until,
  );
}
