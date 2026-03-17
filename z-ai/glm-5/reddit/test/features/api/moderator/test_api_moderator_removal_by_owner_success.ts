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
 * Test that a community owner can successfully remove a moderator from their community.
 *
 * Steps:
 * 1. Create owner member and authenticate
 * 2. Owner creates a community (becomes owner automatically)
 * 3. Create another member to be moderator
 * 4. Owner adds the moderator to the community
 * 5. Owner removes the moderator via DELETE endpoint
 *
 * Validation: Moderator removal succeeds, confirming owner authority.
 */
export async function test_api_moderator_removal_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community (automatically becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Verify owner is set correctly
  TestValidator.equals("owner is creator", community.owner.id, owner.id);
  // 3. Create another member to be moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // 4. Owner adds the moderator to the community
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { memberId: moderatorMember.id },
      },
    );
  typia.assert(moderatorRecord);
  // Verify moderator record properties
  TestValidator.equals(
    "moderator community matches",
    moderatorRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member matches",
    moderatorRecord.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "moderator role is moderator",
    moderatorRecord.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator not deleted initially",
    moderatorRecord.deleted_at,
    null,
  );
  // 5. Owner removes the moderator - this should succeed
  await api.functional.communityPlatform.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorRecord.id,
    },
  );
  // 6. Validate: removal succeeded (no error thrown)
  TestValidator.predicate("moderator removal by owner succeeded", true);
}
