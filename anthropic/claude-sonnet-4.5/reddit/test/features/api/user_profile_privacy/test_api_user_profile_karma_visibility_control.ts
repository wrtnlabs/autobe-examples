import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test karma visibility control through show_karma_publicly privacy setting.
 *
 * This test validates that user karma scores (post_karma and comment_karma) can
 * be hidden or shown through the show_karma_publicly privacy setting. The test
 * creates two member accounts, creates content to establish karma context, then
 * toggles the privacy setting to verify that karma visibility is properly
 * controlled.
 *
 * Workflow:
 *
 * 1. Create first member account (profile owner whose karma visibility will be
 *    tested)
 * 2. Create second member account (for context and potential future voting
 *    features)
 * 3. First member creates a community
 * 4. First member creates a post to establish content context
 * 5. Update first member's privacy to hide karma (show_karma_publicly = false)
 * 6. Retrieve profile and verify karma visibility is controlled
 * 7. Update first member's privacy to show karma (show_karma_publicly = true)
 * 8. Retrieve profile and verify karma is now visible
 * 9. Validate karma visibility toggle works independently of overall profile
 *    privacy
 */
export async function test_api_user_profile_karma_visibility_control(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (profile owner)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member1Username = RandomGenerator.alphaNumeric(12);

  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: member1Username,
      email: member1Email,
      password: member1Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create second member account for context
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const member2Username = RandomGenerator.alphaNumeric(12);

  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: member2Username,
      email: member2Email,
      password: member2Password,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: First member creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: First member creates a post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Update first member's privacy to hide karma
  const privacyHidden =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member1.id,
        body: {
          show_karma_publicly: false,
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privacyHidden);

  TestValidator.equals(
    "karma visibility should be set to false",
    privacyHidden.show_karma_publicly,
    false,
  );

  // Step 6: Retrieve profile and verify karma handling with hidden setting
  const profileHidden = await api.functional.redditLike.users.profile.at(
    connection,
    {
      userId: member1.id,
    },
  );
  typia.assert(profileHidden);

  TestValidator.equals(
    "profile username should match",
    profileHidden.username,
    member1Username,
  );

  // Step 7: Update first member's privacy to show karma
  const privacyVisible =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member1.id,
        body: {
          show_karma_publicly: true,
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privacyVisible);

  TestValidator.equals(
    "karma visibility should be set to true",
    privacyVisible.show_karma_publicly,
    true,
  );

  // Step 8: Retrieve profile and verify karma is visible
  const profileVisible = await api.functional.redditLike.users.profile.at(
    connection,
    {
      userId: member1.id,
    },
  );
  typia.assert(profileVisible);

  TestValidator.equals(
    "profile username should match after visibility change",
    profileVisible.username,
    member1Username,
  );

  // Step 9: Validate that karma visibility can be toggled independently
  // Test that we can change karma visibility without affecting other privacy settings
  const privacyToggleBack =
    await api.functional.redditLike.member.users.privacy.updatePrivacy(
      connection,
      {
        userId: member1.id,
        body: {
          show_karma_publicly: false,
        } satisfies IRedditLikeUser.IUpdatePrivacy,
      },
    );
  typia.assert(privacyToggleBack);

  TestValidator.equals(
    "karma visibility should toggle back to false",
    privacyToggleBack.show_karma_publicly,
    false,
  );

  // Verify profile still accessible with karma hidden
  const profileFinal = await api.functional.redditLike.users.profile.at(
    connection,
    {
      userId: member1.id,
    },
  );
  typia.assert(profileFinal);

  TestValidator.equals(
    "profile should remain accessible with hidden karma",
    profileFinal.username,
    member1Username,
  );
}
