import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test community moderator role details retrieval after appointment by community owner.
 *
 * Validates the complete workflow of community creation, moderator appointment by the owner, and subsequent retrieval of moderator assignment details. Confirms that the retrieved moderator record correctly reflects the delegated authority level and associates with the correct member and community entities.
 *
 * Special attention is given to verifying that the 'role' field correctly represents 'moderator' (delegated authority) rather than 'owner' status, and that the related community and member profile information is properly populated.
 *
 * 1. Register User A as the community owner.
 * 2. Create a community as User A.
 * 3. Register User B who will be appointed as a moderator.
 * 4. User A appoints User B as a moderator in the community.
 * 5. Retrieve moderator assignment details for User B.
 * 6. Validate the response contains correct member, community, and moderator role information.
 */
export async function test_api_community_moderator_role_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate User A as community owner
  const userAConnection: api.IConnection = { host: connection.host };
  const userAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const userAAuthorized = await authorize_member_join(userAConnection, {
    body: userAJoinBody,
  });
  typia.assert(userAAuthorized);
  // 2. Create a community as User A (owner)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      userAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register and authenticate User B to be appointed as a moderator
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  const userBAuthorized = await authorize_member_join(userBConnection, {
    body: userBJoinBody,
  });
  typia.assert(userBAuthorized);
  const userBId = userBAuthorized.id;
  // 4. User A appoints User B as a moderator
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      userAConnection,
      {
        params: { communityId: community.id },
        body: { member_id: userBId },
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Retrieve moderator assignment details for User B
  const moderatorDetails =
    await api.functional.redditLikeCommunity.communities.moderators.at(
      userAConnection,
      {
        communityId: community.id,
        memberId: userBId,
      },
    );
  typia.assert(moderatorDetails);
  // 6. Validate response contains correct moderator information
  TestValidator.equals("role is moderator", moderatorDetails.role, "moderator");
  TestValidator.equals(
    "member ID matches User B",
    moderatorDetails.member.id,
    userBId,
  );
  TestValidator.equals(
    "member username matches User B",
    moderatorDetails.member.username,
    userBAuthorized.username,
  );
  TestValidator.equals(
    "community ID matches created community",
    moderatorDetails.community.id,
    community.id,
  );
  TestValidator.predicate(
    "profile exists for moderator",
    moderatorDetails.profile.id !== undefined,
  );
}
