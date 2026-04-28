import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

/**
 * Test retrieving moderator assignment for a non-assigned member returns 404.
 *
 * Validates that when a member has no moderation assignment in a community,
 * requesting their moderator details returns a 404 Not Found error.
 * This confirms the endpoint correctly rejects requests for member-community pairs
 * that do not have an existing moderation assignment record.
 *
 * 1. Register User A as the community owner.
 * 2. User A creates a community.
 * 3. Register User B who has no moderator assignment in the community.
 * 4. Attempt to retrieve moderator assignment details for User B in User A's community.
 * 5. Validate the request returns 404 Not Found.
 */
export async function test_api_community_moderator_non_assigned_member_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register User A as community owner
  const userAConnection: api.IConnection = { host: connection.host };
  const userALogin: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(userAConnection, { body: userALogin });
  // 2. User A creates a community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      userAConnection,
      { body: prepare_random_reddit_like_community_community() },
    );
  typia.assert(community);
  // 3. Register User B who has no moderator assignment in this community
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoin: IREdditLikeCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const userB = await authorize_member_join(userBConnection, {
    body: userBJoin,
  });
  typia.assert(userB);
  // 4. Validate that retrieving moderator assignment for non-moderator User B returns 404
  await TestValidator.httpError(
    "Non-assigned member returns 404",
    404,
    async () =>
      await api.functional.redditLikeCommunity.communities.moderators.at(
        userAConnection,
        {
          communityId: community.id,
          memberId: userB.id,
        },
      ),
  );
}
