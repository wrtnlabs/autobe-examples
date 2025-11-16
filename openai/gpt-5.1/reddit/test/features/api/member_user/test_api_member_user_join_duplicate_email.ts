import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_member_user_join_duplicate_email(
  connection: api.IConnection,
) {
  /**
   * Validate duplicate email rejection on member user registration.
   *
   * Business flow implemented:
   *
   * 1. Perform a successful registration via POST /auth/memberUser/join with a
   *    randomly generated, valid email, username, password, and session context
   *    (href, referrer, ip).
   * 2. Attempt a second registration using the SAME email but a different username
   *    (and valid password + context) to simulate a duplicate email scenario.
   * 3. Assert that the first call returns a valid
   *    ICommunityPlatformMemberuser.IAuthorized object.
   * 4. Assert that the second call results in an error using TestValidator.error,
   *    representing business enforcement of the unique email constraint. We do
   *    not assert specific HTTP status codes or error payload shape, only that
   *    an error is thrown.
   *
   * Limitations and approach:
   *
   * - We have no listing or lookup API to directly count accounts by email, so we
   *   do not verify the number of accounts. Instead, we validate behavior
   *   indirectly by ensuring a second registration with the same email fails.
   * - We avoid any type-error scenarios: both requests strictly comply with
   *   ICommunityPlatformMemberuser.IJoinRequest, and all responses are
   *   validated with typia.assert where applicable.
   */

  // Step 1: Prepare a shared email and base request data.
  const email = typia.random<string & tags.Format<"email">>();

  const firstJoinBody = {
    username: RandomGenerator.name(1),
    email,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
    ip: "203.0.113.10",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // Step 2: First successful registration.
  const firstAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: firstJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(firstAuthorized);

  // Basic sanity checks on the authorized envelope.
  TestValidator.equals(
    "first join: email in response matches request email",
    firstAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "first join: token.access must be non-empty string",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join: token.refresh must be non-empty string",
    firstAuthorized.token.refresh.length > 0,
  );

  // Step 3: Second registration attempt with same email but different username.
  const secondJoinBody = {
    username: RandomGenerator.name(1),
    email,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/signup-duplicate",
    referrer: "https://example.com/landing",
    ip: "203.0.113.10",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  await TestValidator.error(
    "second join with duplicate email must fail",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
