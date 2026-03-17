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

export async function test_api_ban_access_denied_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner (will become moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 3. Create non-moderator who will attempt unauthorized access
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // 4. Create community (owner becomes moderator automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. Create a ban for the second member
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: bannedMember.id,
          reason: "Test ban reason",
        },
      },
    );
  typia.assert(ban);
  // 6. Non-moderator attempts to access ban information - should receive 403 Forbidden
  await TestValidator.httpError(
    "non-moderator should not access ban information",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.bans.at(
        nonModeratorConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
}
