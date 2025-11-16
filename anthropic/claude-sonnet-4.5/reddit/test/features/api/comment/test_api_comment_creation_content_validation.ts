import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test comment creation with various content lengths to validate character
 * limit enforcement.
 *
 * This test validates that the comment creation API correctly handles content
 * of varying lengths from minimum (1 character) to maximum (10,000 characters).
 * It ensures that:
 *
 * 1. Comments with minimum length (1 character) are accepted
 * 2. Comments with medium length content are successfully created
 * 3. Comments up to maximum length (10,000 characters) are accepted
 * 4. Content is stored exactly as submitted without modification
 * 5. All valid content lengths pass validation and return proper response
 *    structure
 *
 * The test follows this workflow:
 *
 * 1. Create moderator account for community creation
 * 2. Create a community to host the post
 * 3. Create member account for posting and commenting
 * 4. Create a post to receive comments
 * 5. Test comment creation with minimum length content (1 character)
 * 6. Test comment creation with medium length content
 * 7. Test comment creation with maximum length content (10,000 characters)
 * 8. Validate that all comments are created successfully with exact content
 *    preservation
 */
export async function test_api_comment_creation_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community to host the post
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for posting and commenting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10).toLowerCase(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post to receive comments
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Test comment creation with minimum length content (1 character)
  const minLengthContent = "a";
  const minComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: minLengthContent,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(minComment);
  TestValidator.equals(
    "minimum length comment body matches",
    minComment.body,
    minLengthContent,
  );

  // Step 6: Test comment creation with medium length content
  const mediumLengthContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 20,
  });
  const mediumComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: mediumLengthContent,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(mediumComment);
  TestValidator.equals(
    "medium length comment body matches",
    mediumComment.body,
    mediumLengthContent,
  );

  // Step 7: Test comment creation with maximum length content (10,000 characters)
  const maxLengthContent = ArrayUtil.repeat(10000, (i) =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz0123456789 "]),
  ).join("");
  const maxComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: maxLengthContent,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum length comment body matches",
    maxComment.body,
    maxLengthContent,
  );

  // Step 8: Validate all comments were created with correct properties
  TestValidator.equals(
    "minimum comment post ID",
    minComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "medium comment post ID",
    mediumComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "maximum comment post ID",
    maxComment.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals("minimum comment depth", minComment.depth, 0);
  TestValidator.equals("medium comment depth", mediumComment.depth, 0);
  TestValidator.equals("maximum comment depth", maxComment.depth, 0);

  TestValidator.equals("minimum comment edited flag", minComment.edited, false);
  TestValidator.equals(
    "medium comment edited flag",
    mediumComment.edited,
    false,
  );
  TestValidator.equals("maximum comment edited flag", maxComment.edited, false);
}
