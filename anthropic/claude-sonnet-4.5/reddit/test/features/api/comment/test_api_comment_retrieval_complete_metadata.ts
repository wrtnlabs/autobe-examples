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
 * Test that comment retrieval returns all metadata fields including timestamps,
 * edit status, and deletion status.
 *
 * This test validates the completeness and accuracy of comment metadata for
 * rich UI display.
 *
 * Workflow:
 *
 * 1. Create moderator account
 * 2. Create community
 * 3. Create member account
 * 4. Create post in community
 * 5. Create comment on post
 * 6. Retrieve comment and validate complete metadata
 */
export async function test_api_comment_retrieval_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create post in community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create comment on post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const createdComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);

  // Step 6: Retrieve the comment and validate complete metadata
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Validate all metadata fields are present and correct
  TestValidator.equals(
    "comment id matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment body matches",
    retrievedComment.body,
    commentData.body,
  );
  TestValidator.equals(
    "post id matches",
    retrievedComment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "member id matches",
    retrievedComment.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "parent comment id is null",
    retrievedComment.parent_comment_id,
    null,
  );
  TestValidator.equals("depth is 0 for top-level", retrievedComment.depth, 0);
  TestValidator.equals("edited flag is false", retrievedComment.edited, false);
  TestValidator.equals("deleted_at is null", retrievedComment.deleted_at, null);

  // Validate timestamp formats (ISO 8601 date-time)
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedComment.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedComment.updated_at),
  );

  // Validate that created_at and updated_at are equal for new comment
  TestValidator.equals(
    "updated_at equals created_at for new comment",
    retrievedComment.updated_at,
    retrievedComment.created_at,
  );
}
