import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_posts_create } from "../../../generate/generate_random_reddit_member_communities_posts_create";
import { generate_random_reddit_member_posts_comments_create } from "../../../generate/generate_random_reddit_member_posts_comments_create";
import { prepare_random_reddit_comment } from "../../../prepare/prepare_random_reddit_comment";
import { prepare_random_reddit_post_text } from "../../../prepare/prepare_random_reddit_post_text";

export async function test_api_comment_vote_change_up_to_down(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Subscribe to community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communitySubscription =
    await api.functional.reddit.member.communities.subscribe(memberConnection, {
      communityId,
    });
  typia.assert(communitySubscription);
  // 3. Create post
  const post = await generate_random_reddit_member_communities_posts_create(
    memberConnection,
    { params: { communityId: communitySubscription.community.id } },
  );
  // 4. Create comment
  const comment = await generate_random_reddit_member_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  // 5. Upvote the comment
  const upvotedComment =
    await api.functional.reddit.member.comments.votes.postByCommentid(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote: "up" } satisfies IRedditComment.IVote,
      },
    );
  typia.assert(upvotedComment);
  // 6. Change the vote to downvote
  const changedVote =
    await api.functional.reddit.member.comments.votes.postByCommentid(
      memberConnection,
      {
        commentId: upvotedComment.id,
        body: { vote: "down" } satisfies IRedditComment.IVote,
      },
    );
  typia.assert(changedVote);
  // 7. Validate score change (from +1 to -1 = -2 loss)
  // Convert to ISummary type to access voteScore property
  const changedVoteSummary = changedVote as unknown as IRedditComment.ISummary;
  TestValidator.equals(
    "voteScore should be -1",
    changedVoteSummary.voteScore,
    -1,
  );
}
