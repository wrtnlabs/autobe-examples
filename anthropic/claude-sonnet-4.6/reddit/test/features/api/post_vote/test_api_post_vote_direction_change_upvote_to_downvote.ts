import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_vote_direction_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Author creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author subscribes to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Author creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Register a voter member (different from author)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 6. Voter casts initial upvote
  const upvoteResult = await api.functional.community.member.posts.votes.update(
    voterConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(upvoteResult);
  TestValidator.equals(
    "initial vote type is upvote",
    upvoteResult.voteType,
    "upvote",
  );
  TestValidator.equals("voter id matches", upvoteResult.member.id, voter.id);
  TestValidator.equals("post id matches", upvoteResult.post.id, post.id);
  // Confirm the post vote_score is +1 after upvote
  TestValidator.equals(
    "vote score is +1 after upvote",
    upvoteResult.post.vote_score,
    1,
  );
  // 7. Voter changes vote direction from upvote to downvote (target operation)
  const downvoteResult =
    await api.functional.community.member.posts.votes.update(voterConnection, {
      postId: post.id,
      body: { vote_type: "downvote" } satisfies ICommunityPostVote.IUpdate,
    });
  typia.assert(downvoteResult);
  // Validate voteType changed to downvote
  TestValidator.equals(
    "vote type changed to downvote",
    downvoteResult.voteType,
    "downvote",
  );
  // Validate member.id equals voter's id
  TestValidator.equals(
    "voter id matches on downvote result",
    downvoteResult.member.id,
    voter.id,
  );
  // Validate post.id equals the post's id
  TestValidator.equals(
    "post id matches on downvote result",
    downvoteResult.post.id,
    post.id,
  );
  // Validate updatedAt is strictly later than createdAt (vote direction was changed)
  TestValidator.predicate(
    "updatedAt is strictly later than createdAt",
    new Date(downvoteResult.updatedAt).getTime() >
      new Date(downvoteResult.createdAt).getTime(),
  );
  // Validate the post's vote_score is now -1 (was +1, now -1 after direction flip)
  TestValidator.equals(
    "vote score is -1 after direction change",
    downvoteResult.post.vote_score,
    -1,
  );
  // Validate author's karma_score: started at 0, +1 from upvote, -2 from direction change = -1
  TestValidator.equals(
    "author karma_score is -1 after upvote-to-downvote direction change",
    downvoteResult.post.author.karma_score,
    -1,
  );
}
