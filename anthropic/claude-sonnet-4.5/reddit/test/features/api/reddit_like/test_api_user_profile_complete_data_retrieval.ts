import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test retrieving a complete user profile with all available data fields
 * populated.
 *
 * This test validates that a user profile can be retrieved with complete
 * information including username, account age, karma scores (both post and
 * comment karma), biography, avatar, and all metadata properly displayed. The
 * test creates the necessary data structure by:
 *
 * 1. Creating a member account whose profile will be tested
 * 2. Updating the profile with biography and avatar
 * 3. Creating a community for content creation
 * 4. Creating a post to generate post karma
 * 5. Creating a comment to generate comment karma
 * 6. Creating a second member to vote on content
 * 7. Retrieving the profile and validating all fields
 *
 * Note: The original scenario mentioned voting to generate karma, but the API
 * SDK does not provide voting endpoints, so we validate the profile structure
 * without testing karma accumulation through votes.
 *
 * The test ensures the profile presents a complete user identity and reputation
 * picture with all available data fields correctly populated.
 */
export async function test_api_user_profile_complete_data_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create the first member account whose profile will be fully populated
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Username = RandomGenerator.alphaNumeric(12);
  const member1Password = RandomGenerator.alphaNumeric(10) + "A1!";

  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: member1Username,
      email: member1Email,
      password: member1Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Update member1's profile with biography and avatar
  const profileBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const avatarUrl = `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.png`;

  const updatedProfile =
    await api.functional.redditLike.member.users.profile.update(connection, {
      userId: member1.id,
      body: {
        profile_bio: profileBio,
        avatar_url: avatarUrl,
      } satisfies IRedditLikeUser.IProfileUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Create a community for content creation
  const communityCode = RandomGenerator.alphabets(10);
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create a post to generate post karma
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 15,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Create a comment to generate comment karma
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 6: Create a second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Username = RandomGenerator.alphaNumeric(12);
  const member2Password = RandomGenerator.alphaNumeric(10) + "A1!";

  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: member2Username,
      email: member2Email,
      password: member2Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member2);

  // Step 7: Retrieve the fully populated profile of member1
  const retrievedProfile = await api.functional.redditLike.users.profile.at(
    connection,
    {
      userId: member1.id,
    },
  );
  typia.assert(retrievedProfile);

  // Step 8: Validate all profile fields are correctly displayed
  TestValidator.equals(
    "profile user ID matches created member",
    retrievedProfile.id,
    member1.id,
  );

  TestValidator.equals(
    "profile username matches created member",
    retrievedProfile.username,
    member1Username,
  );

  TestValidator.equals(
    "profile biography matches updated bio",
    retrievedProfile.profile_bio,
    profileBio,
  );

  TestValidator.equals(
    "profile avatar URL matches updated avatar",
    retrievedProfile.avatar_url,
    avatarUrl,
  );

  // Validate karma fields exist and are numbers
  TestValidator.predicate(
    "post karma is a non-negative number",
    typeof retrievedProfile.post_karma === "number" &&
      retrievedProfile.post_karma >= 0,
  );

  TestValidator.predicate(
    "comment karma is a non-negative number",
    typeof retrievedProfile.comment_karma === "number" &&
      retrievedProfile.comment_karma >= 0,
  );

  // Validate account creation timestamp exists and is valid date-time format
  TestValidator.predicate(
    "profile has valid created_at timestamp",
    typeof retrievedProfile.created_at === "string" &&
      retrievedProfile.created_at.length > 0,
  );

  // Validate created_at is a valid ISO date-time format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedProfile.created_at,
    ),
  );
}
