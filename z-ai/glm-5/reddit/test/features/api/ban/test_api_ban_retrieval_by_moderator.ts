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

export async function test_api_ban_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 3. Create community (moderator becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 4. Create ban for the second member
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: bannedMember.id,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 5. Retrieve the ban record
  const retrievedBan =
    await api.functional.communityPlatform.member.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate the response
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("reason matches", retrievedBan.reason, banReason);
  TestValidator.equals(
    "member id matches",
    retrievedBan.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals("deleted_at is null", retrievedBan.deleted_at, null);
  TestValidator.equals(
    "moderator role is owner",
    retrievedBan.moderator.role,
    "owner",
  );
}
