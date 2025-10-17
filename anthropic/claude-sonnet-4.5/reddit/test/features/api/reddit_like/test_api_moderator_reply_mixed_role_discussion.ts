import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test complex discussion threads involving both regular members and moderators
 * participating in nested conversations.
 *
 * This test validates that moderators can seamlessly participate in
 * member-initiated discussions while maintaining proper role attribution and
 * threading structure. The test creates both member and moderator accounts,
 * establishes a community, creates a post, has a member create a top-level
 * comment, has the moderator reply to that member comment, and then has another
 * member reply to the moderator's reply.
 *
 * Validation includes:
 *
 * 1. Proper depth calculation across role transitions
 * 2. Correct parent-child relationships maintained regardless of commenter role
 * 3. Vote score initialization for all replies
 * 4. All participants' comments appear in correct hierarchical positions
 */
export async function test_api_moderator_reply_mixed_role_discussion(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: member1Email,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: member2Email,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Member 1 creates a community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<25>,
        description: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 5: Member 2 creates a post in the community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<300>,
      body: RandomGenerator.content({ paragraphs: 2 }) satisfies
        | (string & tags.MaxLength<40000>)
        | undefined,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 6: Member 1 creates a top-level comment on the post
  const topLevelComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({
          sentences: 4,
        }) satisfies string & tags.MinLength<1> & tags.MaxLength<10000>,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Verify top-level comment depth is 0
  TestValidator.equals("top-level comment depth", topLevelComment.depth, 0);
  TestValidator.equals(
    "top-level comment vote score initialized",
    topLevelComment.vote_score,
    0,
  );
  TestValidator.equals(
    "top-level comment parent",
    topLevelComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 7: Moderator replies to the member's top-level comment
  const moderatorReply =
    await api.functional.redditLike.moderator.comments.replies.create(
      connection,
      {
        commentId: topLevelComment.id,
        body: {
          content_text: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MinLength<1> & tags.MaxLength<10000>,
        } satisfies IRedditLikeComment.IReplyCreate,
      },
    );
  typia.assert(moderatorReply);

  // Verify moderator reply depth and parent relationship
  TestValidator.equals("moderator reply depth", moderatorReply.depth, 1);
  TestValidator.equals(
    "moderator reply parent",
    moderatorReply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "moderator reply post",
    moderatorReply.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "moderator reply vote score initialized",
    moderatorReply.vote_score,
    0,
  );

  // Step 8: Member 2 replies to the moderator's reply
  const member2Reply =
    await api.functional.redditLike.moderator.comments.replies.create(
      connection,
      {
        commentId: moderatorReply.id,
        body: {
          content_text: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string & tags.MinLength<1> & tags.MaxLength<10000>,
        } satisfies IRedditLikeComment.IReplyCreate,
      },
    );
  typia.assert(member2Reply);

  // Verify member 2 reply depth and parent relationship
  TestValidator.equals("member 2 reply depth", member2Reply.depth, 2);
  TestValidator.equals(
    "member 2 reply parent",
    member2Reply.reddit_like_parent_comment_id,
    moderatorReply.id,
  );
  TestValidator.equals(
    "member 2 reply post",
    member2Reply.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "member 2 reply vote score initialized",
    member2Reply.vote_score,
    0,
  );
  TestValidator.predicate(
    "member 2 reply not edited",
    member2Reply.edited === false,
  );
}
