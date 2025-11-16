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
 * Validates post-comment relationship integrity when retrieving comments.
 *
 * This test ensures that the comment retrieval endpoint correctly validates
 * that a comment belongs to the specified post context. The system must enforce
 * referential integrity between posts and comments, preventing retrieval of
 * comments through incorrect post contexts.
 *
 * Test Flow:
 *
 * 1. Create moderator account and community infrastructure
 * 2. Create member account for content authoring
 * 3. Create a post within the community
 * 4. Create a comment on that post
 * 5. Retrieve the comment using correct post-comment relationship
 * 6. Validate all comment data and relationships
 */
export async function test_api_comment_retrieval_post_context_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community for post-comment testing
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for post and comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const createdComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: commentBody,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 6: Retrieve the comment using correct post-comment relationship
  const retrievedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 7: Validate comment retrieval and post-comment relationship
  TestValidator.equals(
    "retrieved comment ID matches created comment",
    retrievedComment.id,
    createdComment.id,
  );

  TestValidator.equals(
    "comment body content is preserved",
    retrievedComment.body,
    commentBody,
  );

  TestValidator.equals(
    "comment belongs to correct post",
    retrievedComment.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals(
    "comment author is correct member",
    retrievedComment.reddit_community_member_id,
    member.id,
  );

  TestValidator.equals(
    "top-level comment has null parent",
    retrievedComment.parent_comment_id,
    null,
  );

  TestValidator.equals(
    "top-level comment has depth 0",
    retrievedComment.depth,
    0,
  );

  TestValidator.equals(
    "newly created comment is not edited",
    retrievedComment.edited,
    false,
  );

  TestValidator.equals(
    "comment is not deleted",
    retrievedComment.deleted_at,
    null,
  );

  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedComment.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedComment.updated_at.length > 0,
  );
}
