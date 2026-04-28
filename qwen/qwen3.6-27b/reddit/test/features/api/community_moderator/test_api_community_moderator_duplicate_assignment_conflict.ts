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
 * Test duplicate moderator assignment conflict detection.
 *
 * Validates that when a community owner attempts to appoint a member who is already a moderator for the same community, the system correctly rejects the duplicate assignment with a 409 Conflict HTTP error. This tests the composite unique constraint on (reddit_like_community_member_id, reddit_like_community_community_id) in the moderator assignment table.
 *
 * The scenario ensures that the business rule preventing duplicate moderator roles for the same member-community pair is enforced, which could otherwise lead to unexpected behavior or database integrity issues.
 *
 * 1. Register a community Owner member account.
 * 2. Create a new community where the Owner becomes the creator and highest authority.
 * 3. Register a separate TargetModerator member account.
 * 4. Appoint the TargetModerator as a moderator for the community (first assignment succeeds).
 * 5. Attempt to re-appoint the same TargetModerator for the same community.
 * 6. Verify the duplicate request is rejected with a 409 Conflict HTTP error.
 */
export async function test_api_community_moderator_duplicate_assignment_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  // 2. Create a new community (Owner automatically becomes the creator/owner)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Register the TargetModerator member
  const targetModConnection: api.IConnection = { host: connection.host };
  const targetModAuth = await authorize_member_join(targetModConnection, {
    body: {},
  });
  typia.assert(targetModAuth);
  // 4. Appoint TargetModerator as a moderator for the community (first time - should succeed)
  const moderator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        body: { member_id: targetModAuth.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(moderator);
  // 5. Attempt duplicate appointment - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate moderator assignment returns 409 Conflict",
    409,
    async () => {
      await generate_random_reddit_like_community_member_communities_community_moderators_create(
        ownerConnection,
        {
          body: { member_id: targetModAuth.id },
          params: { communityId: community.id },
        },
      );
    },
  );
}
