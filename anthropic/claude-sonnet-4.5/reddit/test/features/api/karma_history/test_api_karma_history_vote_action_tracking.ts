import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeKarmaHistory";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeKarmaHistory";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test karma history tracking for different vote action types.
 *
 * Validates that the karma history system correctly records all vote action
 * types and their corresponding karma changes. Creates author and voter
 * accounts, then performs a sequence of voting actions (upvote, change to
 * downvote, remove vote) to verify the complete audit trail of voting behavior
 * and reputation impact.
 *
 * Steps:
 *
 * 1. Create content author account
 * 2. Create community for posting
 * 3. Author creates a post
 * 4. Create voter account
 * 5. Voter adds upvote (+1 karma, 'upvote_added' event)
 * 6. Verify karma history records upvote_added
 * 7. Voter changes to downvote (-2 karma swing, 'vote_changed' event)
 * 8. Verify karma history records vote_changed
 * 9. Voter removes downvote (+1 karma recovery, 'vote_removed' event)
 * 10. Verify karma history records vote_removed
 */
export async function test_api_karma_history_vote_action_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create content author account
  const authorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: authorData });
  typia.assert(author);

  // Step 2: Create community for posting
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Author creates a post
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create voter account
  const voterData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const voter: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: voterData });
  typia.assert(voter);

  // Step 5: Voter adds upvote
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const upvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: upvoteData,
    });
  typia.assert(upvote);

  // Step 6: Verify karma history records upvote_added
  const karmaHistoryAfterUpvote: IPageIRedditLikeKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: author.id,
        body: {
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(karmaHistoryAfterUpvote);

  const upvoteEvent = karmaHistoryAfterUpvote.data.find(
    (event) => event.triggered_by_vote_action === "upvote_added",
  );
  typia.assertGuard(upvoteEvent!);
  TestValidator.equals(
    "upvote added karma change",
    upvoteEvent.change_amount,
    1,
  );
  TestValidator.equals(
    "upvote added karma type",
    upvoteEvent.karma_type,
    "post",
  );

  // Step 7: Voter changes to downvote
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikePostVote.ICreate;

  const downvote: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post.id,
      body: downvoteData,
    });
  typia.assert(downvote);

  // Step 8: Verify karma history records vote_changed
  const karmaHistoryAfterChange: IPageIRedditLikeKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: author.id,
        body: {
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(karmaHistoryAfterChange);

  const voteChangedEvent = karmaHistoryAfterChange.data.find(
    (event) => event.triggered_by_vote_action === "vote_changed",
  );
  typia.assertGuard(voteChangedEvent!);
  TestValidator.equals(
    "vote changed karma change",
    voteChangedEvent.change_amount,
    -2,
  );
  TestValidator.equals(
    "vote changed karma type",
    voteChangedEvent.karma_type,
    "post",
  );

  // Step 9: Voter removes downvote
  await api.functional.redditLike.member.posts.votes.erase(connection, {
    postId: post.id,
  });

  // Step 10: Verify karma history records vote_removed
  const karmaHistoryAfterRemoval: IPageIRedditLikeKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: author.id,
        body: {
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(karmaHistoryAfterRemoval);

  const voteRemovedEvent = karmaHistoryAfterRemoval.data.find(
    (event) => event.triggered_by_vote_action === "vote_removed",
  );
  typia.assertGuard(voteRemovedEvent!);
  TestValidator.equals(
    "vote removed karma change",
    voteRemovedEvent.change_amount,
    1,
  );
  TestValidator.equals(
    "vote removed karma type",
    voteRemovedEvent.karma_type,
    "post",
  );

  // Verify complete audit trail exists
  TestValidator.predicate(
    "karma history contains all vote actions",
    karmaHistoryAfterRemoval.data.length >= 3,
  );
}
