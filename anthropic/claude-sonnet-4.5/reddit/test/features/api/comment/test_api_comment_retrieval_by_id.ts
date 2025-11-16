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
 * Test retrieving a specific comment by its unique identifier.
 *
 * This test validates the public read operation for comment retrieval, ensuring
 * that the API correctly returns complete comment entity details including
 * content, metadata, author information, vote counts, and timestamps.
 *
 * Workflow:
 *
 * 1. Create moderator account for community management
 * 2. Create community to host posts and comments
 * 3. Create member account for content authorship
 * 4. Create post within the community
 * 5. Create comment on the post
 * 6. Retrieve the comment by ID
 * 7. Validate all comment fields and relationships
 */
export async function test_api_comment_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityNameRaw = RandomGenerator.alphabets(15);
  const communityName = communityNameRaw.toLowerCase();

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass456!";
  const memberUsername = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      show_online_status: true,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create post within the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create comment on the post
  const commentBodyText = RandomGenerator.paragraph({ sentences: 4 });

  const createdComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentBodyText,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 6: Retrieve the comment by ID
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 7: Validate comment fields
  TestValidator.equals(
    "comment ID matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    commentBodyText,
  );
  TestValidator.equals(
    "comment member ID matches",
    retrievedComment.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment post ID matches",
    retrievedComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment parent is null",
    retrievedComment.parent_comment_id,
    null,
  );
  TestValidator.equals("comment depth is 0", retrievedComment.depth, 0);
  TestValidator.equals("comment is not edited", retrievedComment.edited, false);
  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );
  TestValidator.predicate(
    "comment has created_at timestamp",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "comment has updated_at timestamp",
    retrievedComment.updated_at !== null &&
      retrievedComment.updated_at !== undefined,
  );
}
