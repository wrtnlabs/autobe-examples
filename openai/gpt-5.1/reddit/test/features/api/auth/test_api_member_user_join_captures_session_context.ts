import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that member user join captures and accepts session context.
 *
 * Business goals:
 *
 * - Ensure POST /auth/memberUser/join works with explicit session context (ip,
 *   href, referrer) in the IJoinRequest payload.
 * - Ensure the same endpoint works when the optional ip field is omitted, relying
 *   on the backend to derive IP while preserving href/referrer.
 * - Confirm that successful join returns a fully-typed
 *   ICommunityPlatformMemberuser.IAuthorized envelope with a populated
 *   IAuthorizationToken.
 *
 * Steps:
 *
 * 1. Perform a registration including explicit ip, href, and referrer.
 * 2. Assert the authorization envelope and token structure.
 * 3. Perform a second registration omitting ip but keeping href/referrer.
 * 4. Assert the second authorization envelope and token structure.
 *
 * This test cannot directly see community_platform_memberuser_sessions but
 * documents the expectation that each successful join results in a session row
 * populated with the provided (or derived) context.
 */
export async function test_api_member_user_join_captures_session_context(
  connection: api.IConnection,
) {
  // 1. First registration with explicit ip, href, and referrer
  const username1 = `user_${RandomGenerator.alphaNumeric(12)}`;
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(16);
  const ip1 = "203.0.113.42"; // documentation-style example IPv4
  const href1 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();

  const joinBody1 = {
    username: username1,
    email: email1,
    password: password1,
    ip: ip1,
    href: href1,
    referrer: referrer1,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized1: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody1,
    });

  // Type-level assertion of the response
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized1);
  typia.assert<IAuthorizationToken>(authorized1.token);

  // Business assertions for the first registration
  TestValidator.equals(
    "first join: username in response matches request",
    authorized1.username,
    username1,
  );
  TestValidator.equals(
    "first join: email in response matches request",
    authorized1.email,
    email1,
  );
  TestValidator.predicate(
    "first join: access token must be non-empty string",
    typeof authorized1.token.access === "string" &&
      authorized1.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join: refresh token must be non-empty string",
    typeof authorized1.token.refresh === "string" &&
      authorized1.token.refresh.length > 0,
  );

  // 2. Second registration omitting optional ip but providing href/referrer
  const username2 = `user_${RandomGenerator.alphaNumeric(12)}`;
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(16);
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();

  const joinBody2 = {
    username: username2,
    email: email2,
    password: password2,
    href: href2,
    referrer: referrer2,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody2,
    });

  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized2);
  typia.assert<IAuthorizationToken>(authorized2.token);

  TestValidator.equals(
    "second join: username in response matches request",
    authorized2.username,
    username2,
  );
  TestValidator.equals(
    "second join: email in response matches request",
    authorized2.email,
    email2,
  );
  TestValidator.predicate(
    "second join: access token must be non-empty string",
    typeof authorized2.token.access === "string" &&
      authorized2.token.access.length > 0,
  );
  TestValidator.predicate(
    "second join: refresh token must be non-empty string",
    typeof authorized2.token.refresh === "string" &&
      authorized2.token.refresh.length > 0,
  );
}
