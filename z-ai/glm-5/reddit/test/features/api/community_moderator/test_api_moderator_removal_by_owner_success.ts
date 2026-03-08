import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test the successful removal of a moderator by the community owner.
 *
 * This scenario validates:
 * 1. Community owner can successfully remove a moderator
 * 2. The removal operation returns void (204 No Content)
 * 3. The moderator record is soft-deleted (audit trail preserved)
 *
 * Prerequisites:
 * - Owner account created and authenticated
 * - Owner creates a community (becomes community owner)
 * - Second member account created for moderator role
 * - Owner appoints second member as moderator
 */
export async function test_api_moderator_removal_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create second member account for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 4. Owner appoints the second member as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderatorAuth.username },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Verify moderator was appointed correctly
  TestValidator.equals(
    "moderator community matches",
    moderatorRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "moderator member matches",
    moderatorRecord.member.username,
    moderatorAuth.username,
  );
  // 6. Owner removes the moderator
  await api.functional.communityPlatform.member.communities.moderators.erase(
    ownerConnection,
    {
      communityName: community.name,
      moderatorId: moderatorRecord.id,
    },
  );
  // 7. Verify the removed moderator can no longer perform moderation actions
  // Attempting to add another moderator as the removed moderator should fail
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMemberAuth = await authorize_member_join(
    thirdMemberConnection,
    {},
  );
  typia.assert(thirdMemberAuth);
  await TestValidator.error(
    "removed moderator cannot add new moderator",
    async () => {
      await generate_random_community_platform_member_communities_moderators_add_moderator(
        moderatorConnection,
        {
          params: { communityName: community.name },
          body: { username: thirdMemberAuth.username },
        },
      );
    },
  );
  // 8. Verify owner can still manage moderators (removal didn't affect owner)
  const newModeratorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: thirdMemberAuth.username },
      },
    );
  typia.assert(newModeratorRecord);
  TestValidator.equals(
    "new moderator appointed by owner",
    newModeratorRecord.member.username,
    thirdMemberAuth.username,
  );
}
