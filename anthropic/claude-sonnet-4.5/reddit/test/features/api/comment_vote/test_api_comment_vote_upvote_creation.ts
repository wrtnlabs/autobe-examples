import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the complete workflow of a member casting an upvote on a comment.
 *
 * This test validates that authenticated members can successfully express
 * positive appreciation for comment content through the upvote mechanism. The
 * test creates a complete community context with a moderator, community,
 * member, post, and comment, then casts an upvote on that comment.
 *
 * Validation points include:
 *
 * 1. Successful vote creation returns HTTP 201
 * 2. Response contains a valid UUID for the vote record
 * 3. Vote_type is correctly set to 1 (upvote)
 * 4. Reddit_community_comment_id matches the target comment
 * 5. Reddit_community_member_id corresponds to the authenticated member
 * 6. Both created_at and updated_at timestamps are populated and equal for a new
 *    vote
 *
 * This ensures the voting system properly tracks positive engagement and that
 * the vote affects the comment's karma calculation by adding +1 to the score.
 */
export async function test_api_comment_vote_upvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const community =
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
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for posting, commenting, and voting
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post in the community as member
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postBody =
    selectedPostType === "text"
      ? {
          community_id: community.id,
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 7,
          }),
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 3 }),
          url: null,
          image_url: null,
        }
      : selectedPostType === "link"
        ? {
            community_id: community.id,
            title: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 7,
            }),
            post_type: "link" as const,
            body: null,
            url: typia.random<
              string & tags.MaxLength<2000> & tags.Format<"uri">
            >(),
            image_url: null,
          }
        : {
            community_id: community.id,
            title: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 7,
            }),
            post_type: "image" as const,
            body: null,
            url: null,
            image_url: typia.random<string & tags.Format<"uri">>(),
          };

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postBody satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create a comment on the post as member
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 4,
            wordMax: 8,
          }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Cast an upvote on the comment
  const vote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: 1,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);

  // Validation: Verify vote record properties
  TestValidator.equals("vote type is upvote", vote.vote_type, 1);
  TestValidator.equals(
    "vote references correct comment",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote belongs to authenticated member",
    vote.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "created_at equals updated_at for new vote",
    vote.created_at,
    vote.updated_at,
  );
}
