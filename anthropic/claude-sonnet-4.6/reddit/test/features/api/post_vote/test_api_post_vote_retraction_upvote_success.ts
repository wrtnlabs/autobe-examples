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

export async function test_api_post_vote_retraction_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the post author (Member A)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // Step 2: Create a community as the author
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the author to the community
  const authorSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(authorSubscription);
  // Step 4: Create a text post in the community
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
  // Step 5: Register a separate voter member (Member B)
  // A member cannot vote on their own post, so we need a different member
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // Step 6: Subscribe the voter to the community (required to interact)
  const voterSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      voterConnection,
      { communityId: community.id },
    );
  typia.assert(voterSubscription);
  // Step 7: Cast an upvote on the post as Member B
  const vote = await api.functional.community.member.posts.votes.update(
    voterConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote type is upvote", vote.voteType, "upvote");
  // Step 8: Retract the upvote (the main action under test)
  // erase() returns void (204 No Content) — success is indicated by no error thrown
  await api.functional.community.member.posts.votes.erase(voterConnection, {
    postId: post.id,
  });
  // Step 9: Verify the vote record is permanently deleted:
  // a second retraction attempt must return 404 (no vote to retract)
  await TestValidator.httpError(
    "second retraction must return 404 - vote was permanently deleted",
    404,
    async () => {
      await api.functional.community.member.posts.votes.erase(voterConnection, {
        postId: post.id,
      });
    },
  );
}
