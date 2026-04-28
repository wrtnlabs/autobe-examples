import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
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
 * Test that a non-owner member cannot appoint themselves or another member as a moderator.
 *
 * Validates that only the community owner has authority to appoint moderators. When a regular member who is not the owner attempts to add a moderator, the system must reject the request with a 403 Forbidden error.
 *
 * This test ensures proper access control on community moderation operations, preventing unauthorized privilege escalation.
 *
 * 1. Register a new member account to serve as the community owner.
 * 2. Create a new community as the owner, establishing ownership authority.
 * 3. Register a second member account who does not hold any authority in the community.
 * 4. Have the non-owner attempt to appoint themselves as a moderator for the community.
 * 5. Verify the system rejects the unauthorized moderator appointment with 403 Forbidden.
 */
export async function test_api_community_moderator_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(owner);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Register non-owner member
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {},
  });
  typia.assert(nonOwner);
  // 4 & 5. Non-owner attempts to appoint themselves as moderator - must fail with 403
  await TestValidator.httpError(
    "non-owner cannot appoint moderator",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.communities.community_moderators.create(
        nonOwnerConnection,
        {
          communityId: community.id,
          body: {
            member_id: nonOwner.id,
          } satisfies IRedditLikeCommunityModerator.ICreate,
        },
      );
    },
  );
}
