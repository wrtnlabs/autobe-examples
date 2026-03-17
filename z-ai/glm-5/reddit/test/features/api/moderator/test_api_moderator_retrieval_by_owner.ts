import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that a community owner can retrieve detailed moderator information.
 *
 * Setup:
 * 1. Create owner account and authenticate
 * 2. Create a community (creator becomes owner)
 * 3. Create moderator account
 * 4. Add moderator to community
 *
 * Execution:
 * - Owner retrieves moderator details
 * - Verify role, member info, community info, timestamps
 */
export async function test_api_moderator_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create a community - creator becomes owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // Step 4: Add moderator to community (owner adds moderator)
  const moderatorAssignment =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { memberId: moderatorAuth.id },
      },
    );
  typia.assert(moderatorAssignment);
  // Test: Owner retrieves moderator details
  const retrievedModerator =
    await api.functional.communityPlatform.member.communities.moderators.at(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: moderatorAssignment.id,
      },
    );
  typia.assert(retrievedModerator);
  // Verify moderator assignment details
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "role is moderator",
    retrievedModerator.role,
    "moderator",
  );
  TestValidator.equals(
    "member ID matches",
    retrievedModerator.member.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "member username matches",
    retrievedModerator.member.username,
    moderatorAuth.username,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedModerator.community.name,
    community.name,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedModerator.deleted_at,
    null,
  );
}
