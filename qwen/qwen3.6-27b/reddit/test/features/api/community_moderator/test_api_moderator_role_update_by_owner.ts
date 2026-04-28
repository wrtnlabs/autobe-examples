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
 * Test community owner updating a moderator's role assignment.
 *
 * Validates the role update workflow where the community owner modifies an existing
 * moderator assignment. The owner authenticates, creates a community, adds another
 * member as a moderator, then updates that moderator's role to owner-level authority.
 *
 * 1. Authenticate member A as community owner.
 * 2. Authenticate member B to be added as moderator.
 * 3. Owner creates a community and becomes the owner.
 * 4. Owner adds member B as moderator in the community.
 * 5. Owner updates member B's moderator role to 'owner'.
 * 6. Validate the role was updated while other fields remain unchanged.
 */
export async function test_api_moderator_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const joinedOwner = await authorize_member_join(ownerConnection, {
    body: {} satisfies Partial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Authenticate member B (to be added as moderator)
  const modConnection: api.IConnection = { host: connection.host };
  const joinedMod = await authorize_member_join(modConnection, {
    body: {} satisfies Partial<IREdditLikeCommunityMember.IJoin>,
  });
  // 3. Owner creates a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Owner adds member B as moderator in the community
  const moderator =
    await api.functional.redditLikeCommunity.member.communities.community_moderators.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: joinedMod.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Owner updates member B's role to 'owner'
  const updatedModerator =
    await api.functional.redditLikeCommunity.member.communities.community_moderators.update(
      ownerConnection,
      {
        communityId: community.id,
        communityModeratorId: moderator.id,
        body: {
          role: "owner",
        } satisfies IREdditLikeCommunityCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);
  // 6. Validate the updated moderator
  TestValidator.equals("role updated to owner", updatedModerator.role, "owner");
  TestValidator.equals(
    "moderator id unchanged",
    updatedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "member unchanged",
    updatedModerator.member.id,
    joinedMod.id,
  );
}
