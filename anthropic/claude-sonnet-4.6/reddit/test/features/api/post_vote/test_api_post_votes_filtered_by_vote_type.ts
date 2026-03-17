import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostVote";
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

export async function test_api_post_votes_filtered_by_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Post author: register + authenticate ──────────────────────────────
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // ── 2. Author creates a community ────────────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // ── 3. Author subscribes to the community ────────────────────────────────
  const authorSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(authorSubscription);
  // ── 4. Author creates a text post ────────────────────────────────────────
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
  // ── 5. Voter A: register + subscribe + upvote ────────────────────────────
  const voterAConnection: api.IConnection = { host: connection.host };
  const voterA = await authorize_member_join(voterAConnection, {});
  typia.assert(voterA);
  const voterASubscription =
    await api.functional.community.member.communities.subscriptions.create(
      voterAConnection,
      { communityId: community.id },
    );
  typia.assert(voterASubscription);
  const upvote = await api.functional.community.member.posts.votes.update(
    voterAConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(upvote);
  // ── 6. Voter B: register + subscribe + downvote ──────────────────────────
  const voterBConnection: api.IConnection = { host: connection.host };
  const voterB = await authorize_member_join(voterBConnection, {});
  typia.assert(voterB);
  const voterBSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      voterBConnection,
      { communityId: community.id },
    );
  typia.assert(voterBSubscription);
  const downvote = await api.functional.community.member.posts.votes.update(
    voterBConnection,
    {
      postId: post.id,
      body: { vote_type: "downvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // ── 7. Filter by upvote ──────────────────────────────────────────────────
  const upvotePage = await api.functional.community.member.posts.votes.index(
    authorConnection,
    {
      postId: post.id,
      body: {
        voteType: "upvote",
        page: 1,
        limit: 20,
      } satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(upvotePage);
  TestValidator.equals(
    "upvote filter: records",
    upvotePage.pagination.records,
    1,
  );
  TestValidator.equals("upvote filter: data length", upvotePage.data.length, 1);
  TestValidator.equals(
    "upvote filter: vote_type",
    upvotePage.data[0]!.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote filter: voter id matches voterA",
    upvotePage.data[0]!.voter.id,
    voterA.id,
  );
  TestValidator.predicate(
    "upvote filter: no downvote in data",
    upvotePage.data.every((v) => v.vote_type !== "downvote"),
  );
  // ── 8. Filter by downvote ─────────────────────────────────────────────────
  const downvotePage = await api.functional.community.member.posts.votes.index(
    authorConnection,
    {
      postId: post.id,
      body: {
        voteType: "downvote",
        page: 1,
        limit: 20,
      } satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(downvotePage);
  TestValidator.equals(
    "downvote filter: records",
    downvotePage.pagination.records,
    1,
  );
  TestValidator.equals(
    "downvote filter: data length",
    downvotePage.data.length,
    1,
  );
  TestValidator.equals(
    "downvote filter: vote_type",
    downvotePage.data[0]!.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote filter: voter id matches voterB",
    downvotePage.data[0]!.voter.id,
    voterB.id,
  );
  TestValidator.predicate(
    "downvote filter: no upvote in data",
    downvotePage.data.every((v) => v.vote_type !== "upvote"),
  );
}
