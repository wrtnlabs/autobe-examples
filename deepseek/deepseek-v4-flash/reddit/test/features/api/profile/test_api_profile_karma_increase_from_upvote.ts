import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

/**
 * Test that the profile's karma score accurately reflects upvotes received on the member's content.
 *
 * Validates the denormalized real-time karma aggregate by creating a member who produces content (post), having another member upvote that content, and verifying that the original member's profile karma has increased from the initial 0 to 1. Also validates that other profile fields remain intact and the updated_at timestamp is refreshed.
 *
 * 1. Register Member A via authorize_member_join and capture the authorized response.
 * 2. Member A creates a community using the generate utility.
 * 3. Member A subscribes to the community (prerequisite for posting).
 * 4. Member A creates a text-type post in the community.
 * 5. Register Member B via authorize_member_join with different credentials.
 * 6. Member B casts an upvote (value=1) on Member A's post.
 * 7. Retrieve Member A's updated profile via GET /member/profile.
 * 8. Verify karma equals 1.
 * 9. Validate other profile fields (display_name, biography, avatar_uri) remain intact.
 * 10. Confirm updated_at has been refreshed (updated_at > created_at).
 */
export async function test_api_profile_karma_increase_from_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community with Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community (prerequisite for posting)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 4. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 5. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B upvotes Member A's post
  const vote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      },
    },
  );
  typia.assert(vote);
  // 7. Retrieve Member A's updated profile
  const profile =
    await api.functional.communityPlatform.member.profile.at(memberAConnection);
  typia.assert(profile);
  // 8. Verify karma increased from initial 0 to 1
  TestValidator.equals("karma after upvote", profile.karma, 1);
  // 9. Validate other profile fields remain intact
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    memberA.profile.display_name,
  );
  TestValidator.equals("biography is null", profile.biography, null);
  TestValidator.equals("avatar_uri is null", profile.avatar_uri, null);
  // 10. Confirm updated_at has been refreshed to reflect the karma change
  TestValidator.predicate(
    "updated_at after created_at",
    profile.updated_at > profile.created_at,
  );
}
