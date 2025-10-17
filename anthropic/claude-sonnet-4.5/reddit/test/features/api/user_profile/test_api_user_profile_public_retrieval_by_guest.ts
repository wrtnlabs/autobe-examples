import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Tests retrieval of a public user profile by an unauthenticated guest user.
 *
 * This test validates the fundamental requirement that public user profiles are
 * accessible to all users including unauthenticated guests. It creates a member
 * account with default public privacy settings, then retrieves that member's
 * profile without any authentication to verify public accessibility.
 *
 * Test workflow:
 *
 * 1. Create a new member account (profile owner)
 * 2. Create an unauthenticated connection (guest user)
 * 3. Retrieve the member's profile using the guest connection
 * 4. Validate that all public profile information is present and correct
 */
export async function test_api_user_profile_public_retrieval_by_guest(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account whose profile will be retrieved
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const createdMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(createdMember);

  // Step 2: Create an unauthenticated connection to simulate a guest user
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Retrieve the member's public profile without authentication
  const publicProfile: IRedditLikeUser.IProfile =
    await api.functional.redditLike.users.profile.at(guestConnection, {
      userId: createdMember.id,
    });
  typia.assert(publicProfile);

  // Step 4: Validate the public profile contains all expected information
  TestValidator.equals(
    "profile user ID matches created member",
    publicProfile.id,
    createdMember.id,
  );
  TestValidator.equals(
    "profile username matches created member",
    publicProfile.username,
    createdMember.username,
  );
  TestValidator.equals(
    "profile post karma matches initial value",
    publicProfile.post_karma,
    createdMember.post_karma,
  );
  TestValidator.equals(
    "profile comment karma matches initial value",
    publicProfile.comment_karma,
    createdMember.comment_karma,
  );
  TestValidator.predicate(
    "profile has creation timestamp",
    publicProfile.created_at !== null && publicProfile.created_at !== undefined,
  );
}
