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

export async function test_api_post_vote_upvote_new_cast(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register 'author' member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {});
  typia.assert(authorMember);
  // 2. Author creates a community
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Author subscribes to the community (prerequisite for posting)
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
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Register 'voter' member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterMember = await authorize_member_join(voterConnection, {});
  typia.assert(voterMember);
  // 6. As voter, cast an upvote on the author's post
  const vote = await api.functional.community.member.posts.votes.update(
    voterConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(vote);
  // Validate: voteType is 'upvote'
  TestValidator.equals("vote type is upvote", vote.voteType, "upvote");
  // Validate: voter's member ID matches
  TestValidator.equals(
    "voter member id matches",
    vote.member.id,
    voterMember.id,
  );
  // Validate: post ID matches
  TestValidator.equals("post id matches", vote.post.id, post.id);
  // Validate: createdAt equals updatedAt (no direction change)
  TestValidator.equals(
    "createdAt equals updatedAt (no direction change yet)",
    vote.createdAt,
    vote.updatedAt,
  );
  // Validate: post vote_score is +1 after upvote
  TestValidator.equals("post vote score is 1", vote.post.vote_score, 1);
}
