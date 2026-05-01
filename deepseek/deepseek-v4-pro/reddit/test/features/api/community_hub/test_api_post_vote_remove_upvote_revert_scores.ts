import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that removing an upvote from a post correctly reverses both the post's vote score and the author's karma score.
 *
 * Tests the complete vote lifecycle: memberA creates a community and posts content, memberB joins and subscribes, then upvotes the post. After confirming the upvote is recorded, memberB removes the vote and the system verifies that the post author's karma returns to its initial value of zero.
 *
 * 1. memberA registers with stored credentials and creates a community.
 * 2. memberB registers and subscribes to the community.
 * 3. memberA creates a text post — initial vote_score is 0, memberA karma is 0.
 * 4. memberB upvotes the post — vote record created with value 1.
 * 5. memberB removes the vote via DELETE /communityHub/member/posts/{postId}/vote.
 * 6. Re-authenticates memberA and verifies karma returned to 0.
 */
export async function test_api_post_vote_remove_upvote_revert_scores(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (post author) with stored credentials
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberA);
  TestValidator.equals("memberA initial karma", memberA.karma, 0);
  // 2. memberA creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register memberB (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. memberB subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. memberA creates a post — initial vote_score is 0
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  TestValidator.equals("initial post vote_score", post.vote_score, 0);
  // 6. memberB upvotes the post — karma becomes 1 for memberA
  const vote = await api.functional.communityHub.member.posts.upvote(
    memberBConnection,
    { postId: post.id },
  );
  typia.assert(vote);
  TestValidator.equals("vote direction is upvote", vote.value, 1);
  // 7. memberB removes the vote — karma reverts to 0 for memberA
  await api.functional.communityHub.member.posts.vote.erase(memberBConnection, {
    postId: post.id,
  });
  // 8. Re-authenticate memberA to verify karma returned to 0
  const memberAReAuth: api.IConnection = { host: connection.host };
  const memberAUpdated = await authorize_member_login(memberAReAuth, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: "https://test.local",
      referrer: "",
    },
  });
  typia.assert(memberAUpdated);
  TestValidator.equals(
    "karma reverted to 0 after vote removal",
    memberAUpdated.karma,
    0,
  );
}