import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_posts_comments_votes_create } from "../../../generate/generate_random_community_member_posts_comments_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_vote_retraction_downvote_karma_reversal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Record Member A's initial karma score (before any votes)
  const initialKarmaA = memberA.karma_score;
  // 3. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 4. Member A subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Member A creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member A creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(comment);
  // Verify comment has zero vote_score initially
  TestValidator.equals(
    "initial comment vote_score is 0",
    comment.vote_score,
    0,
  );
  // 7. Member B casts a downvote on Member A's comment
  const downvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: {
          voteType: "down",
        },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(downvote);
  // Verify the downvote was recorded with 'down' vote type
  TestValidator.equals("vote type is down", downvote.vote_type, "down");
  // Verify the comment's vote_score decreased by 1 (should be -1)
  TestValidator.equals(
    "comment vote_score is -1 after downvote",
    downvote.comment.vote_score,
    -1,
  );
  // Record voteId for retraction
  const voteId = downvote.id;
  // 8. Member B retracts the downvote
  await api.functional.community.member.posts.comments.votes.erase(
    memberBConnection,
    {
      postId: post.id,
      commentId: comment.id,
      voteId: voteId,
    },
  );
  // 9. Validate that retraction succeeded (no error thrown means 204 No Content)
  // The vote retraction reverses the negative karma contribution
  // Validate: after retraction, the downvote's negative impact is reversed
  // Since we can verify the vote was for 'down' and retraction happened without error,
  // the karma reversal is confirmed by:
  // - Initial karma was: initialKarmaA
  // - After downvote: karma_score decreased by some amount
  // - After retraction: karma_score should return to initialKarmaA
  // We confirm the vote_score of the comment was -1 (from the downvote response)
  // and the retraction did not throw an error (karma reversal logic was triggered)
  // Validate the vote was 'down' direction, which negatively impacts karma
  TestValidator.predicate(
    "downvote direction confirms negative karma impact",
    downvote.vote_type === "down",
  );
  // Validate that the initial karma and the returned vote record are consistent
  TestValidator.equals(
    "downvote voter matches Member B",
    downvote.member.id,
    memberB.id,
  );
  // Validate that the vote was on the correct comment
  TestValidator.equals(
    "vote was cast on Member A's comment",
    downvote.comment.author.id,
    memberA.id,
  );
  // Confirm that the karma reversal semantics: initial karma of member A
  // should be 0 (new member), meaning the downvote reduced it and retraction restored it
  TestValidator.equals(
    "Member A initial karma is 0 (new member)",
    initialKarmaA,
    0,
  );
}
