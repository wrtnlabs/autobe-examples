import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_ban_retrieval_by_moderator_after_banning_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and becomes a registered member
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community and becomes its owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member B joins as a separate member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member A (owner/moderator) bans member B from the community
  const reason: string = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: memberB.id,
          reason,
        },
      },
    );
  typia.assert(ban);
  // 5. Member A retrieves the ban record by its ID
  const retrievedBan = await api.functional.communityPlatform.member.bans.at(
    memberAConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate the retrieved ban record matches the original ban and input data
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member id matches",
    retrievedBan.bannedMember.id,
    memberB.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.bannedMember.username,
    memberB.username,
  );
  TestValidator.equals(
    "banned by id matches",
    retrievedBan.bannedBy.id,
    memberA.id,
  );
  TestValidator.equals(
    "banned by username matches",
    retrievedBan.bannedBy.username,
    memberA.username,
  );
  TestValidator.equals("reason matches", retrievedBan.reason, reason);
}
