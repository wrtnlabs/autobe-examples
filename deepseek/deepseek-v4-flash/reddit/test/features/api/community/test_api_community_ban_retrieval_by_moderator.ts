import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that an appointed moderator can retrieve a ban record from a community they moderate.
 *
 * Verifies the complete ban retrieval flow: three members are registered, the owner creates a community, appoints the second member as moderator, who then bans the third member. The moderator then retrieves the ban record and the test confirms the record is accurately returned, including that `bannedBy` correctly identifies the moderator as the banning authority (not the owner).
 *
 * 1. Owner registers via POST /auth/member/join.
 * 2. Future moderator registers via POST /auth/member/join.
 * 3. Target banned member registers via POST /auth/member/join.
 * 4. Owner creates a community via POST /member/communities.
 * 5. Owner appoints the second member as a moderator via POST /member/moderators.
 * 6. Moderator bans the third member via POST /member/community-bans.
 * 7. Moderator retrieves the ban record via GET /member/community-bans/{banId}.
 * 8. Validate that the retrieved ban record matches the created one, that `bannedBy` references the moderator (not the owner), and that a non-owner moderator has read access to ban records.
 */
export async function test_api_community_ban_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1-3: Register three members (owner, moderator, banned member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedConnection, {});
  // Step 4: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 5: Owner appoints the second member as a moderator
  const moderatorRecord =
    await generate_random_community_platform_member_moderators_create(
      ownerConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: moderator.username,
        },
      },
    );
  typia.assert(moderatorRecord);
  // Step 6: Moderator bans the third member from the community
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      moderatorConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: bannedMember.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // Step 7: Moderator retrieves the ban record by its ID
  const retrievedBan =
    await api.functional.communityPlatform.member.community_bans.at(
      moderatorConnection,
      {
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Step 8: Validate the retrieved ban record
  // Confirm the ban record ID matches
  TestValidator.equals("ban record ID matches", retrievedBan.id, ban.id);
  // Confirm bannedBy is the moderator (not the owner), proving non-owner moderator read access
  TestValidator.equals(
    "banned by is the moderator",
    retrievedBan.bannedBy.id,
    moderator.id,
  );
  TestValidator.notEquals(
    "banned by is not the owner",
    retrievedBan.bannedBy.id,
    owner.id,
  );
  // Confirm the banned member is the target
  TestValidator.equals(
    "banned member matches",
    retrievedBan.bannedMember.id,
    bannedMember.id,
  );
  // Confirm the community reference matches
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    community.id,
  );
}
