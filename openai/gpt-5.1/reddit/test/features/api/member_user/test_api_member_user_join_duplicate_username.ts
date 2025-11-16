import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate duplicate-username rejection behavior on memberUser join.
 *
 * Business goal
 *
 * - Ensure that /auth/memberUser/join enforces uniqueness on username for
 *   community_platform_memberusers.
 * - Confirm that a second registration attempt with the same username but a
 *   different email/password is rejected with a client error.
 * - Confirm that the first successful join returns a fully-typed
 *   ICommunityPlatformMemberuser.IAuthorized envelope.
 *
 * Test flow
 *
 * 1. Build a join request body for a new member user using
 *    ICommunityPlatformMemberuser.IJoinRequest with:
 *
 *    - Username: randomized handle
 *    - Email: randomized email
 *    - Password: strong test password string
 *    - Href/referrer: valid URI strings (can be random but must respect
 *         tags.Format<"uri">)
 *    - Ip: omit (undefined) to let server derive from connection
 * 2. Call api.functional.auth.memberUser.join(connection, { body }) for the first
 *    time and assert:
 *
 *    - The call resolves successfully (no HttpError thrown).
 *    - The response matches ICommunityPlatformMemberuser.IAuthorized via
 *         typia.assert.
 *    - The username and email in the response echo back the original request's
 *         username/email.
 * 3. Build a second join body where:
 *
 *    - Username: exactly the same as in step 1
 *    - Email: a different randomized email value
 *    - Password: another valid strong password
 *    - Href/referrer: different but still valid URIs.
 *    - Ip: still omitted.
 * 4. Invoke api.functional.auth.memberUser.join again with the second body, but
 *    this time wrap the call with TestValidator.httpError (or
 *    TestValidator.error if HttpError is not available) to assert that a client
 *    error is thrown. Since the exact status code contract (400 vs 409) is not
 *    rigidly specified in the DTOs, this test should:
 *
 *    - Use TestValidator.error with an async callback that awaits the join call.
 *    - Not assert on the specific status code or error payload shape, only that an
 *         error occurs.
 * 5. There is no direct listing endpoint for member users in this test scope, so
 *    we rely on the fact that a failed second join indicates that the platform
 *    did not create a second account for the conflicting username. This
 *    expectation is captured in the description and comments but not explicitly
 *    re-verified via API.
 */
export async function test_api_member_user_join_duplicate_username(
  connection: api.IConnection,
) {
  // 1. Prepare first join request with unique username/email
  const username: string = RandomGenerator.name(1);
  const email1: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const href1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer1: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody1 = {
    username,
    email: email1,
    password: "TestPassword_1234!",
    href: href1,
    referrer: referrer1,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 2. First join should succeed and return authorized envelope
  const firstAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody1,
    });
  typia.assert(firstAuthorized);

  TestValidator.equals(
    "first join: username should echo request",
    firstAuthorized.username,
    username,
  );
  TestValidator.equals(
    "first join: email should echo request",
    firstAuthorized.email,
    email1,
  );

  // 3. Prepare second join request with same username but different email
  const email2: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const href2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer2: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody2 = {
    username, // same username as first join
    email: email2,
    password: "AnotherPassword_5678!",
    href: href2,
    referrer: referrer2,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  // 4. Second join with duplicate username must fail with a client error
  await TestValidator.error("duplicate username join must fail", async () => {
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody2,
    });
  });
}
