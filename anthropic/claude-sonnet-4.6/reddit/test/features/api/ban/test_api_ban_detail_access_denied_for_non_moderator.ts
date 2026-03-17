import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_ban_detail_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create community as owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register target member (to be banned)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {});
  typia.assert(target);
  // Step 4: Ban the target member as owner
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: { banned_member_id: target.id },
    },
  );
  typia.assert(ban);
  // Step 5: Register a third member (non-moderator regular member)
  const nonModConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModConnection, {});
  // Main test: Non-moderator attempts to access ban detail → expect 403
  await TestValidator.httpError(
    "non-moderator cannot access ban detail",
    403,
    async () => {
      await api.functional.community.member.communities.bans.at(
        nonModConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
}
