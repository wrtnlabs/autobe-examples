import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that member user registration enforces email uniqueness.
 *
 * Business goal:
 *
 * - Ensure that POST /auth/memberUser/join cannot be used to create multiple
 *   member accounts with the same email address.
 * - The first registration with a unique email must succeed and issue a valid
 *   authorization payload including JWT tokens.
 * - A second registration attempt using the same email (even with different
 *   password/displayName/profile data) must fail at business-rule level.
 *
 * Scenario:
 *
 * 1. Generate a unique email address and construct a valid registration payload
 *    using IDiscussionBoardMemberUserJoin.IRequest.
 * 2. Call api.functional.auth.memberUser.join with that payload.
 *
 *    - Expect success.
 *    - Validate the response structure with typia.assert.
 *    - Optionally validate that the token field looks populated but do not inspect
 *         token internals beyond type assertion.
 * 3. Immediately build a second registration payload using the same email but
 *    different password/displayName/href/referrer and possibly different
 *    optional fields (bio/location/ip), still satisfying
 *    IDiscussionBoardMemberUserJoin.IRequest.
 * 4. Call api.functional.auth.memberUser.join again with the duplicated email
 *    payload inside TestValidator.error, because we expect the backend to
 *    reject the request due to the unique email constraint in the underlying
 *    discussion_board_memberusers table.
 * 5. Do not attempt to verify exact HTTP status codes or error messages; only
 *    assert that an error is thrown.
 * 6. As the SDK internally manages connection.headers.Authorization, do not touch
 *    connection.headers in the test; rely solely on the join function’s side
 *    effects.
 */
export async function test_api_member_user_join_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Prepare first registration payload with a unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const firstJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://discussion.example.com/signup",
    referrer: "https://discussion.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  // 2. First join attempt should succeed
  const firstAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstAuthorized);

  // Basic sanity predicates on core business fields
  TestValidator.equals(
    "authorized email should match registration email",
    firstAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "authorized member id must be a non-empty string",
    firstAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "access token must be non-empty",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty",
    firstAuthorized.token.refresh.length > 0,
  );

  // 3. Prepare second registration payload with the same email but different
  //    credentials and context fields
  const secondJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(14),
    displayName: RandomGenerator.name(3),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: "Seoul, South Korea",
    ip: "192.0.2.1",
    href: "https://discussion.example.com/another-signup",
    referrer: "https://discussion.example.com/campaign",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  // 4. Second join attempt must fail due to email uniqueness constraint.
  await TestValidator.error(
    "second registration with same email must fail",
    async () => {
      await api.functional.auth.memberUser.join(connection, {
        body: secondJoinBody,
      });
    },
  );
}
