import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
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
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_already_unbanned_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  // 2. Member1 creates a community (becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  // 3. Create Member2 (will be banned)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  // 4. Member1 bans Member2 from the community
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      member1Connection,
      {
        params: { communityId: community.id },
        body: { memberId: member2.id },
      },
    );
  // 5. Member1 unbans Member2 (first unban - should succeed)
  await api.functional.communityPlatform.member.communities.bans.erase(
    member1Connection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Member1 attempts to unban Member2 again (should fail - already unbanned)
  await TestValidator.error(
    "attempting to unban an already unbanned user should be rejected",
    async () =>
      await api.functional.communityPlatform.member.communities.bans.erase(
        member1Connection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      ),
  );
}
