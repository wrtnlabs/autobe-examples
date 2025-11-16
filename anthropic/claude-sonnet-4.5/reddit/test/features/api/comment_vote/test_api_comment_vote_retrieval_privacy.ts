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
 * Test that a member can only retrieve their own vote status, not other
 * members' votes, ensuring voting privacy.
 *
 * This test validates the authentication context properly restricts vote
 * retrieval to the authenticated member's own votes. The scenario creates two
 * separate member accounts (Member A and Member B), establishes a community
 * context, creates a post, adds a comment, has Member A cast a vote on the
 * comment, and then authenticates as Member B to attempt retrieving vote status
 * on the same comment.
 *
 * The test validates that Member B's retrieval returns their own vote status
 * (null/no vote since they haven't voted), not Member A's vote, ensuring vote
 * privacy. This confirms the platform maintains voting privacy by restricting
 * vote retrieval to the authenticated member's own voting history.
 *
 * Steps:
 *
 * 1. Create Member A account
 * 2. Create Member B account
 * 3. Create moderator account
 * 4. Create community as moderator
 * 5. Switch to Member A and create a post
 * 6. Create a comment on the post as Member A
 * 7. Cast a vote on the comment as Member A
 * 8. Verify Member A can retrieve their own vote
 * 9. Switch to Member B authentication
 * 10. Create a vote for Member B to ensure they have their own vote record
 * 11. Validate Member B sees their own vote, not Member A's vote
 */
export async function test_api_comment_vote_retrieval_privacy(
  connection: api.IConnection,
) {
  // Step 1: Create Member A account
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = "password123";
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Create Member B account
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = "password456";
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Step 3: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "modpass123";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(15),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Switch to Member A and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create a comment on the post as Member A
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Cast a vote on the comment as Member A
  const memberAVoteType = RandomGenerator.pick([1, -1] as const);
  const memberAVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: memberAVoteType,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(memberAVote);

  // Step 8: Verify Member A can retrieve their own vote
  const memberAVoteRetrieved =
    await api.functional.redditCommunity.member.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(memberAVoteRetrieved);
  TestValidator.equals(
    "member A vote ID matches",
    memberAVoteRetrieved.id,
    memberAVote.id,
  );
  TestValidator.equals(
    "member A vote type matches",
    memberAVoteRetrieved.vote_type,
    memberAVoteType,
  );
  TestValidator.equals(
    "member A vote belongs to member A",
    memberAVoteRetrieved.reddit_community_member_id,
    memberA.id,
  );

  // Step 9: Switch to Member B authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 10: Member B casts their own vote on the same comment
  const memberBVoteType = RandomGenerator.pick([1, -1] as const);
  const memberBVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: memberBVoteType,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(memberBVote);

  // Step 11: Retrieve vote status as Member B - should see their own vote, not Member A's
  const memberBVoteRetrieved =
    await api.functional.redditCommunity.member.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(memberBVoteRetrieved);

  // Validate that Member B's retrieved vote is their own vote, not Member A's vote
  TestValidator.equals(
    "member B sees their own vote ID",
    memberBVoteRetrieved.id,
    memberBVote.id,
  );
  TestValidator.equals(
    "member B vote belongs to member B",
    memberBVoteRetrieved.reddit_community_member_id,
    memberB.id,
  );
  TestValidator.notEquals(
    "member B does not see member A vote ID",
    memberBVoteRetrieved.id,
    memberAVote.id,
  );
  TestValidator.notEquals(
    "member B vote is not member A vote",
    memberBVoteRetrieved.reddit_community_member_id,
    memberA.id,
  );
}
