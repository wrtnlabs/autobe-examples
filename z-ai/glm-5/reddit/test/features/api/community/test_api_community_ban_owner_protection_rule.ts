import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test the business rule that moderators cannot ban the community owner.
 *
 * Steps:
 * 1. Create owner account and authenticate
 * 2. Create a community (owner automatically gets is_owner=true)
 * 3. Create a moderator account
 * 4. Moderator subscribes to the community
 * 5. Owner appoints the moderator
 * 6. Moderator attempts to ban the community owner
 *
 * Validates: The ban operation should fail with 403 Forbidden,
 * confirming that the owner has protected status and cannot be banned
 * from their own community.
 */
export async function test_api_community_ban_owner_protection_rule(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create community (creator automatically becomes owner with is_owner=true)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 4. Moderator subscribes to the community (required for moderator appointment)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      moderatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Owner appoints the moderator
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator.username },
      },
    );
  typia.assert(moderatorRecord);
  // 6. Moderator attempts to ban the community owner - should fail
  // This tests the authorization hierarchy where owner has protected status
  await TestValidator.error(
    "moderator cannot ban community owner",
    async () => {
      await api.functional.community.member.communities.bans.create(
        moderatorConnection,
        {
          communityName: community.name,
          body: { username: owner.username } satisfies ICommunityBan.ICreate,
        },
      );
    },
  );
}
