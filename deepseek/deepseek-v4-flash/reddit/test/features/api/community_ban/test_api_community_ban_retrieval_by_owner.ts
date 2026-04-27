import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Verify that a community owner can retrieve a ban record they issued.
 *
 * Validates the complete ban retrieval workflow: registering two members, creating a community as the owner, banning a second member from that community, and retrieving the ban record via GET /member/community-bans/{banId}. Ensures that all fields of the returned ban record match the original ban creation data, including nested relations for the banned member, banning moderator (owner), and the community.
 *
 * 1. Register two members: the community owner and the target member to be banned.
 * 2. Owner creates a community with random name, description, and icon.
 * 3. Owner bans the second member, specifying a reason.
 * 4. Owner retrieves the ban record by its UUID.
 * 5. Validate the retrieved ban matches the created values for id, reason, bannedMember, bannedBy, community, timestamps, and expired_at (null for indefinite ban).
 */
export async function test_api_community_ban_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two members
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner bans the second member
  const reason: string = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      ownerConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: bannedMember.username,
          reason: reason,
        },
      },
    );
  typia.assert(ban);
  // 4. Retrieve the ban record as the owner
  const retrievedBan =
    await api.functional.communityPlatform.member.community_bans.at(
      ownerConnection,
      {
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 5. Validate ban record fields
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals("reason matches", retrievedBan.reason, reason);
  // 5.1. Validate nested bannedMember
  TestValidator.equals(
    "banned member id",
    retrievedBan.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "banned member username",
    retrievedBan.bannedMember.username,
    bannedMember.username,
  );
  // 5.2. Validate nested bannedBy (the owner)
  TestValidator.equals("banned by id", retrievedBan.bannedBy.id, owner.id);
  TestValidator.equals(
    "banned by username",
    retrievedBan.bannedBy.username,
    owner.username,
  );
  // 5.3. Validate nested community
  TestValidator.equals("community id", retrievedBan.community.id, community.id);
  TestValidator.equals(
    "community name",
    retrievedBan.community.name,
    community.name,
  );
  // 5.4. Validate timestamps are valid ISO dates
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedBan.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedBan.updated_at)),
  );
  // 5.5. expired_at must be null for an indefinite ban (no expiration was set during creation)
  TestValidator.equals(
    "expired_at is null for indefinite ban",
    retrievedBan.expired_at,
    null,
  );
}
