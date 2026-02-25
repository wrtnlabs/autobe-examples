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
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_vote } from "../../../generate/generate_random_community_member_posts_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

/**
 * Test that karma score is correctly calculated and displayed in the member's
 * profile after receiving votes on their content.
 *
 * Setup flow:
 * 1. Member A joins, creates a community, and creates a post
 * 2. Member A retrieves their profile to capture initial karma
 * 3. Member B joins and subscribes to Member A's community
 * 4. Member B upvotes Member A's post (+1 karma to author)
 * 5. Member A retrieves their profile and verifies karma increased by 1
 */
export async function test_api_member_profile_karma_from_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (auto-subscribed as owner)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A creates a post in their community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Member A retrieves their profile to capture initial karma
  const profileABefore =
    await api.functional.community.member.profile.at(memberAConnection);
  typia.assert(profileABefore);
  // 5. Member B joins the platform
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B subscribes to Member A's community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberBConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 7. Member B upvotes Member A's post (+1 karma to author)
  const voteResult = await generate_random_community_member_posts_vote(
    memberBConnection,
    {
      params: { postId: post.id },
      body: { vote: 1 },
    },
  );
  typia.assert(voteResult);
  // 8. Member A retrieves their profile to check updated karma
  const profileAAfter =
    await api.functional.community.member.profile.at(memberAConnection);
  typia.assert(profileAAfter);
  // 9. Verify karma increased by exactly 1 from the upvote
  TestValidator.equals(
    "karma increased by 1 from upvote",
    profileAAfter.karma,
    profileABefore.karma + 1,
  );
  // 10. Verify profile fields remain accurate
  TestValidator.equals("member id unchanged", profileAAfter.id, memberA.id);
  TestValidator.equals(
    "username unchanged",
    profileAAfter.username,
    memberA.username,
  );
  TestValidator.equals("email unchanged", profileAAfter.email, memberA.email);
}
