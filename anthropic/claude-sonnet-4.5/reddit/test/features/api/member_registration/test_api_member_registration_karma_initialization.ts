import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that new member accounts have karma scores initialized to zero.
 *
 * This test validates the fundamental karma system initialization during member
 * registration. It ensures that both post_karma and comment_karma are properly
 * set to 0 when a new member account is created through the join endpoint.
 *
 * The karma system is central to the Reddit Community platform, tracking member
 * contributions through upvotes and downvotes on posts and comments. Proper
 * initialization is critical to ensure accurate karma tracking from the moment
 * an account is created.
 *
 * Test workflow:
 *
 * 1. Generate valid registration data with random username, email, and password
 * 2. Call the member registration API endpoint
 * 3. Verify successful registration with complete member data
 * 4. Assert post_karma is initialized to 0
 * 5. Assert comment_karma is initialized to 0
 */
export async function test_api_member_registration_karma_initialization(
  connection: api.IConnection,
) {
  // Generate random registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Register new member account
  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the response structure
  typia.assert(authorizedMember);

  // Verify post_karma is initialized to 0
  TestValidator.equals(
    "post_karma should be initialized to 0",
    authorizedMember.post_karma,
    0,
  );

  // Verify comment_karma is initialized to 0
  TestValidator.equals(
    "comment_karma should be initialized to 0",
    authorizedMember.comment_karma,
    0,
  );
}
