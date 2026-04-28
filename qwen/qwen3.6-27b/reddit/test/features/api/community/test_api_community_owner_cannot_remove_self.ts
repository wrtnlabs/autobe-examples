import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
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
 * Verify that a community owner cannot remove their own moderator assignment.
 *
 * Validates that the community retains its administrative authority source by preventing the owner from self-removing as a moderator. This is a critical business rule ensuring no community can exist without an owner.
 *
 * The test registers a member, creates a community where they become the owner, then attempts to delete their own moderator record. The API must reject this with 403 Forbidden.
 *
 * 1. Register a new member who will become the community owner.
 * 2. Create a community with the authenticated member as the creator/owner.
 * 3. Attempt to remove the owner's moderator assignment using their own member id.
 * 4. Verify the operation is rejected with 403 Forbidden status.
 */
export async function test_api_community_owner_cannot_remove_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create a community - the authenticated member becomes the owner
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Validate community creator is the owner
  TestValidator.equals(
    "community creator matches owner",
    community.creator.id,
    authorized.id,
  );
  // 4. Attempt to remove self (owner) as moderator - should fail with 403 Forbidden
  await TestValidator.httpError(
    "owner cannot remove self as moderator must return 403",
    403,
    async () =>
      await api.functional.redditLikeCommunity.member.communities.moderators.erase(
        memberConnection,
        {
          communityId: community.id,
          moderatorId: authorized.id,
        },
      ),
  );
}
