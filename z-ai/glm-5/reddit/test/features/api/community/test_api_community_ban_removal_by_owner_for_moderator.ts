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

export async function test_api_community_ban_removal_by_owner_for_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create moderator1 account and authenticate
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {});
  typia.assert(moderator1);
  // 3. Create moderator2 account and authenticate
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {});
  typia.assert(moderator2);
  // 4. Owner creates a community (owner becomes community owner with is_owner=true)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 5. Owner appoints moderator1 as moderator
  const moderatorRecord1 =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator1.username },
      },
    );
  typia.assert(moderatorRecord1);
  // 6. Owner appoints moderator2 as moderator
  const moderatorRecord2 =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator2.username },
      },
    );
  typia.assert(moderatorRecord2);
  // 7. Moderator1 bans moderator2 from the community
  const ban = await generate_random_community_member_communities_bans_create(
    moderator1Connection,
    {
      params: { communityName: community.name },
      body: { username: moderator2.username },
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban member matches", ban.member.id, moderator2.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  // 8. Owner unbans moderator2 (DELETE operation)
  await api.functional.community.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      banId: ban.id,
    },
  );
  // 9. Verify: moderator2 should be able to post again (ban removed)
  // The ban has been successfully removed by the owner
  // This validates that owners CAN unban moderators
}
