import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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
 * Test scenario: Moderator successfully unbans a regular member from community
 *
 * Business Workflow:
 * 1. Owner creates a community and appoints a moderator
 * 2. Moderator bans a regular member from the community
 * 3. Moderator unbans the member (DELETE operation)
 * 4. Verify the unban operation completes successfully
 */
export async function test_api_community_ban_removal_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts: owner, moderator, target
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {});
  typia.assert(target);
  // 2. Owner creates community (becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Owner appoints moderator to the community
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator.username },
      },
    );
  typia.assert(moderatorRecord);
  // 4. Moderator bans target member
  const ban = await generate_random_community_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityName: community.name },
      body: { username: target.username },
    },
  );
  typia.assert(ban);
  // Validate ban was created correctly
  TestValidator.equals(
    "ban community matches",
    ban.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member username",
    ban.member.username,
    target.username,
  );
  TestValidator.equals(
    "banner username",
    ban.bannedBy.username,
    moderator.username,
  );
  // 5. Moderator unbans the target member (DELETE operation)
  await api.functional.community.member.communities.bans.erase(
    moderatorConnection,
    {
      communityName: community.name,
      banId: ban.id,
    },
  );
  // 6. Verify the ban was removed - attempting to remove again should fail
  await TestValidator.error("ban no longer exists", async () => {
    await api.functional.community.member.communities.bans.erase(
      moderatorConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  });
}
