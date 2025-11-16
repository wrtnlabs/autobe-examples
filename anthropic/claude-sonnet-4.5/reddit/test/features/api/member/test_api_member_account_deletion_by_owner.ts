import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful member account deletion by the account owner.
 *
 * This test validates that an authenticated member can permanently delete their
 * own account from the platform. The test creates a new member account through
 * registration, authenticates using the issued tokens, and then calls the
 * delete endpoint using the member's username.
 *
 * The test verifies:
 *
 * 1. Member account creation succeeds and returns authentication tokens
 * 2. Account deletion by the owner succeeds
 * 3. Deletion response contains the complete member information including activity
 *    metrics
 * 4. All karma scores are properly initialized to zero for a newly created account
 *
 * This validates the complete account lifecycle from registration to deletion
 * and ensures proper authorization enforcement where only the account owner can
 * delete their own account.
 */
export async function test_api_member_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const memberRegistration = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Validate the registration response
  TestValidator.equals(
    "username matches registration",
    authorizedMember.username,
    memberRegistration.username,
  );
  TestValidator.equals(
    "email matches registration",
    authorizedMember.email,
    memberRegistration.email,
  );
  TestValidator.equals(
    "email verified is false for new account",
    authorizedMember.email_verified,
    false,
  );
  TestValidator.equals(
    "post karma initialized to zero",
    authorizedMember.post_karma,
    0,
  );
  TestValidator.equals(
    "comment karma initialized to zero",
    authorizedMember.comment_karma,
    0,
  );

  // Step 2: Delete the member account using the authenticated connection
  // Note: The join operation automatically sets the authorization header
  const deletedMember: IRedditCommunityGuest =
    await api.functional.redditCommunity.member.members.erase(connection, {
      username: authorizedMember.username,
    });
  typia.assert(deletedMember);

  // Step 3: Verify the deletion response contains correct member information
  TestValidator.equals(
    "deleted member total posts",
    deletedMember.total_posts,
    0,
  );
  TestValidator.equals(
    "deleted member total comments",
    deletedMember.total_comments,
    0,
  );
  TestValidator.equals(
    "deleted member post karma",
    deletedMember.post_karma,
    0,
  );
  TestValidator.equals(
    "deleted member comment karma",
    deletedMember.comment_karma,
    0,
  );
  TestValidator.equals(
    "deleted member total karma",
    deletedMember.total_karma,
    0,
  );
}
