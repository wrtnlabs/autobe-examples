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

export async function test_api_post_votes_empty_when_no_votes_cast(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (post author)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community using the utility function
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe the author to the community (prerequisite for posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community (no votes will be cast)
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
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
  // Verify initial vote score is 0 on the created post
  TestValidator.equals("initial vote score is zero", post.voteScore, 0);
  // 5. Call vote listing endpoint with default (empty) body — expect empty result
  const allVotes = await api.functional.community.member.posts.votes.index(
    memberConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(allVotes);
  TestValidator.equals(
    "records is 0 (no votes)",
    allVotes.pagination.records,
    0,
  );
  TestValidator.equals("pages is 0 (no votes)", allVotes.pagination.pages, 0);
  TestValidator.equals("current page is 1", allVotes.pagination.current, 1);
  TestValidator.equals("data array is empty", allVotes.data.length, 0);
  // 6. Filter by upvote — still empty
  const upvotes = await api.functional.community.member.posts.votes.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        voteType: "upvote",
      } satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(upvotes);
  TestValidator.equals("upvote records is 0", upvotes.pagination.records, 0);
  TestValidator.equals("upvote data array is empty", upvotes.data.length, 0);
  // 7. Filter by downvote — still empty
  const downvotes = await api.functional.community.member.posts.votes.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        voteType: "downvote",
      } satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(downvotes);
  TestValidator.equals(
    "downvote records is 0",
    downvotes.pagination.records,
    0,
  );
  TestValidator.equals(
    "downvote data array is empty",
    downvotes.data.length,
    0,
  );
}
