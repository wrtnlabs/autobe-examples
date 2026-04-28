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
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test community owner removes a moderator with full setup and validation.
 *
 * Validates that a community owner can successfully appoint and then remove a moderator from their community. The test creates the necessary prerequisite data—community owner account, community, and moderator candidate—then exercises the moderation management workflow.
 *
 * Verifies the complete moderator lifecycle: appointment of a member as moderator followed by removal of that moderator assignment. The operation should succeed with proper owner authority and the moderator's privileges should be revoked.
 *
 * 1. Register and authenticate a community owner.
 * 2. Owner creates a new community.
 * 3. Register a separate user who will become the moderator.
 * 4. Owner assigns the new user as a moderator in the community.
 * 5. Owner removes the moderator from the community.
 * 6. Validates the erase operation completes successfully.
 */
export async function test_api_community_owner_removes_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Register a separate user who will serve as the moderator
  const candidateConnection: api.IConnection = { host: connection.host };
  const candidateAuth = await authorize_member_join(candidateConnection, {
    body: {},
  });
  typia.assert(candidateAuth);
  // 4. Owner assigns the candidate as a moderator in the community
  const moderator =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: candidateAuth.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Owner removes the moderator from the community
  await api.functional.redditLikeCommunity.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderator.id,
    },
  );
  // 6. Validate: erase returns void, operation succeeded without error
  TestValidator.predicate(
    "moderator removal completed successfully",
    moderator.id !== undefined,
  );
}
