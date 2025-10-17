import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that newly registered users have zero karma scores initially.
 *
 * This test validates the karma initialization requirements during user
 * registration. When a new member account is created on the Reddit-like
 * platform, the system must initialize both post_karma and comment_karma to 0,
 * with total karma also being 0.
 *
 * Steps:
 *
 * 1. Register a new member account with valid credentials
 * 2. Retrieve the karma scores for the newly created user
 * 3. Verify that post_karma is 0
 * 4. Verify that comment_karma is 0
 * 5. Verify that total_karma is 0
 */
export async function test_api_user_karma_initial_state_after_registration(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const newMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(newMember);

  // Step 2: Retrieve karma for the newly registered user
  const karma: IRedditLikeUser.IKarma =
    await api.functional.redditLike.users.karma.at(connection, {
      userId: newMember.id,
    });

  typia.assert(karma);

  // Step 3-5: Validate all karma scores are initialized to 0
  TestValidator.equals("post_karma should be 0", karma.post_karma, 0);
  TestValidator.equals("comment_karma should be 0", karma.comment_karma, 0);
  TestValidator.equals("total_karma should be 0", karma.total_karma, 0);
}
