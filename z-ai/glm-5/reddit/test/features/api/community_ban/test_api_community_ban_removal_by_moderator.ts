import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test that a community moderator can successfully remove a ban.
 *
 * Setup:
 * 1. Owner creates community
 * 2. Owner appoints a moderator
 * 3. Moderator bans a user
 *
 * Test:
 * 4. Moderator calls unban API
 * 5. Verify operation completes successfully
 * 6. Verify re-unban fails (confirming ban was removed)
 */
export async function test_api_community_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create moderator account and connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // Step 3: Create user to be banned
  const bannedUser = await authorize_member_join({ host: connection.host }, {});
  typia.assert(bannedUser);
  // Step 4: Owner creates community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 5: Owner appoints moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderator.username },
      },
    );
  typia.assert(moderatorRecord);
  // Step 6: Moderator bans the user
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityName: community.name },
        body: { bannedUserId: bannedUser.id },
      },
    );
  typia.assert(ban);
  // Verify ban is active before removal
  TestValidator.equals("ban is active", ban.deleted_at, null);
  // Step 7: Moderator removes the ban
  await api.functional.communityPlatform.member.communities.bans.unban(
    moderatorConnection,
    {
      communityName: community.name,
      banId: ban.id,
    },
  );
  // Step 8: Verify the ban was removed by attempting to unban again
  // This should fail because the ban is already soft-deleted
  await TestValidator.httpError(
    "cannot unban already removed ban",
    404,
    async () => {
      await api.functional.communityPlatform.member.communities.bans.unban(
        moderatorConnection,
        {
          communityName: community.name,
          banId: ban.id,
        },
      );
    },
  );
}
