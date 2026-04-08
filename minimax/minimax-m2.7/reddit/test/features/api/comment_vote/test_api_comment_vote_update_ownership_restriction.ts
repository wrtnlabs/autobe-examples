import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_votes_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_vote_update_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Member A creates community, subscribes, creates post, and comment
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberAConnection,
      { body: { communityId: community.id } },
    );
  typia.assert(subscription);
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    { body: { communityId: community.id } },
  );
  typia.assert(post);
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // Member A casts upvote on the comment
  const vote =
    await generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
      memberAConnection,
      {
        params: { commentId: comment.id },
        body: { direction: "upvote" },
      },
    );
  typia.assert(vote);
  // Setup: Member B joins (different user session)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Test Execution: Member B attempts to update Member A's vote
  // Expected: 403 Forbidden - user does not own this vote
  await TestValidator.httpError(
    "member B cannot update member A's vote",
    403,
    async () =>
      await api.functional.redditClone.member.redditClone.comments.votes.update(
        memberBConnection,
        {
          commentId: comment.id,
          voteId: vote.id,
          body: {
            direction: "downvote",
          } satisfies IRedditClonePostVote.IUpdate,
        },
      ),
  );
  // Verify original vote is unchanged - Member A's vote should still exist with upvote direction
  TestValidator.equals(
    "original vote direction remains upvote",
    vote.direction,
    "upvote",
  );
  TestValidator.equals(
    "comment vote score is 1 (from Member A's upvote)",
    vote.commentVoteScore,
    1,
  );
}
