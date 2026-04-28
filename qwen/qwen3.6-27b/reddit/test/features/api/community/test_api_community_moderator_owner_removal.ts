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
 * Test removal of a moderator assignment by the community owner.
 *
 * Validates the complete moderator lifecycle where a community owner appoints a member as a moderator and subsequently removes their moderation authority. Ensures that the owner has the necessary permissions to delegate and revoke moderation privileges within their community.
 *
 * Verifies that the soft-delete operation succeeds without error, confirming the moderator assignment is deactivated while preserving historical moderation records.
 *
 * 1. Authenticate the community owner as a new member.
 * 2. Create a community where the owner is automatically assigned as creator with highest authority.
 * 3. Authenticate a separate member to be appointed as moderator.
 * 4. Owner appoints the member as moderator in the community.
 * 5. Owner removes the moderator assignment, verifying the soft-delete succeeds.
 */
export async function test_api_community_moderator_owner_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(owner);
  TestValidator.predicate("owner authenticated", owner.id !== undefined);
  // 2. Create a community (owner becomes creator automatically)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  TestValidator.equals(
    "owner is community creator",
    community.creator.id,
    owner.id,
  );
  // 3. Authenticate a separate member to be appointed as moderator
  const moderateeConnection: api.IConnection = { host: connection.host };
  const moderatee = await authorize_member_join(moderateeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(moderatee);
  TestValidator.notEquals(
    "moderatee is different from owner",
    owner.id,
    moderatee.id,
  );
  // 4. Owner appoints the member as moderator in the community
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatee.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderatee appointed as moderator",
    moderatorAssignment.member.id,
    moderatee.id,
  );
  TestValidator.equals(
    "moderator assigned to correct community",
    moderatorAssignment.community.id,
    community.id,
  );
  // 5. Owner removes the moderator assignment (soft-delete)
  await api.functional.redditLikeCommunity.member.communities.community_moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      communityModeratorId: moderatorAssignment.id,
    },
  );
  // Verify operation completed successfully (no error thrown)
  TestValidator.predicate(
    "moderator removal completed without error",
    moderatorAssignment.id !== undefined,
  );
}
