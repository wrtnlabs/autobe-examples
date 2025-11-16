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
 * Test voting by multiple different members on the same comment to validate
 * independent vote tracking.
 *
 * This test creates two separate member accounts (Member A and Member B),
 * establishes a community context, creates a post, adds a comment to the post,
 * has Member A cast an upvote on the comment, and then has Member B cast a
 * downvote on the same comment. The test validates that both votes are recorded
 * independently without conflicts.
 *
 * Validation points include: both vote creation requests return success status,
 * each vote has a unique UUID, Member A's vote record shows vote_type: 1 with
 * their member_id, Member B's vote record shows vote_type: -1 with their
 * member_id, ensuring the voting system maintains vote independence between
 * different members and correctly tracks individual member opinions on the same
 * content.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create community for testing context
 * 3. Create Member A account and authenticate
 * 4. Create post in the community
 * 5. Create comment on the post
 * 6. Member A casts upvote (vote_type: 1) on the comment
 * 7. Create Member B account and authenticate
 * 8. Member B casts downvote (vote_type: -1) on the same comment
 * 9. Validate both votes have unique IDs, correct vote types, and correct member
 *    IDs
 */
export async function test_api_comment_vote_by_multiple_members(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
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

  // Step 2: Create community
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
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create Member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberAEmail,
      password: memberAPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Step 4: Create post in community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create comment on post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Member A casts upvote
  const voteA =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: 1 as const,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(voteA);

  // Step 7: Create Member B and authenticate
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberBEmail,
      password: memberBPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Step 8: Member B casts downvote on the same comment
  const voteB =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: -1 as const,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(voteB);

  // Step 9: Validate both votes
  TestValidator.notEquals("Votes have different IDs", voteA.id, voteB.id);
  TestValidator.equals("Vote A is upvote", voteA.vote_type, 1);
  TestValidator.equals("Vote B is downvote", voteB.vote_type, -1);
  TestValidator.equals(
    "Vote A belongs to Member A",
    voteA.reddit_community_member_id,
    memberA.id,
  );
  TestValidator.equals(
    "Vote B belongs to Member B",
    voteB.reddit_community_member_id,
    memberB.id,
  );
  TestValidator.equals(
    "Both votes target same comment",
    voteA.reddit_community_comment_id,
    comment.id,
  );
}
