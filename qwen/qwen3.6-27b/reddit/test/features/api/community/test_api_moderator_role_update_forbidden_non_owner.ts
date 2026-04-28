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
 * Validates that non-owners cannot update moderator role assignments.
 *
 * This test ensures that the community owner authority is strictly enforced for moderator management operations. Only the community creator holds the necessary permissions to modify moderator roles, while regular members are restricted from escalating or demoting moderators.
 *
 * 1. Authenticate three distinct members: an owner, a non-owner, and a target moderator.
 * 2. The owner creates a new community and appoints the target member as a moderator.
 * 3. The non-owner attempts to modify the target moderator's role assignment via a PUT request.
 * 4. The system returns a 403 Forbidden error, preventing unauthorized role modifications.
 */
export async function test_api_moderator_role_update_forbidden_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A as the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, { body: {} });
  typia.assert(owner);
  // 2. Authenticate member B as a regular non-owner member
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {},
  });
  typia.assert(nonOwner);
  // 3. Authenticate member C to be added as the target moderator
  const targetModeratorConnection: api.IConnection = { host: connection.host };
  const targetModerator = await authorize_member_join(
    targetModeratorConnection,
    { body: {} },
  );
  typia.assert(targetModerator);
  // 4. Member A (owner) creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. Member A (owner) adds member C as a moderator to the community
  const moderator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: targetModerator.id },
      },
    );
  typia.assert(moderator);
  // 6. Member B (non-owner) attempts to update member C's moderator role assignment
  // This should fail with HTTP 403 Forbidden because only owners can update moderator roles
  await TestValidator.httpError(
    "non-owner cannot update moderator role assignment",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.communities.community_moderators.update(
        nonOwnerConnection,
        {
          communityId: community.id,
          communityModeratorId: moderator.id,
          body: {
            role: "moderator",
          } satisfies IREdditLikeCommunityCommunityModerator.IUpdate,
        },
      );
    },
  );
}
