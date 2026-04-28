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
 * Test authorization guard preventing non-owner members from removing moderator assignments.
 *
 * Validates that only the community owner can remove moderator assignments. Non-owner members attempting to remove moderators should receive a 403 Forbidden response, confirming proper authorization enforcement.
 *
 * The test flow follows a realistic scenario: the original community owner appoints someone else as a moderator. When a third-party non-owner member attempts to remove that moderator, the system rejects it due to insufficient authorization. This verifies the authorizationActor rule and specification step 5 which checks that the community creator_id matches the requester.
 *
 * 1. Authenticate the community owner.
 * 2. Create a community with the owner.
 * 3. Authenticate a member to be appointed as moderator.
 * 4. Owner appoints the member as a moderator.
 * 5. Authenticate a different non-owner member (third party).
 * 6. Non-owner member attempts to remove the moderator assignment.
 * 7. Verify the system rejects with 403 Forbidden because the requester is not the community owner.
 */
export async function test_api_community_moderation_non_owner_removal_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate the community owner.
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, { body: {} });
  typia.assert(owner);
  // 2. Create a community with the owner.
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Authenticate a member to be appointed as moderator.
  const toBeModeratorConnection: api.IConnection = { host: connection.host };
  const toBeModerator = await authorize_member_join(toBeModeratorConnection, {
    body: {},
  });
  typia.assert(toBeModerator);
  // 4. Owner appoints the member as a moderator.
  const moderator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: toBeModerator.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Authenticate a different non-owner member (third party).
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {},
  });
  typia.assert(nonOwner);
  // 6. Non-owner member attempts to remove the moderator assignment.
  // 7. Verify the system rejects with 403 Forbidden.
  await TestValidator.httpError(
    "non-owner removal rejected",
    403,
    async () =>
      await api.functional.redditLikeCommunity.member.communities.community_moderators.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
          communityModeratorId: moderator.id,
        },
      ),
  );
}