import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_ban_retrieval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner (community creator) connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create community (owner automatically becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create target user (to be banned) connection and authenticate
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUserAuth = await authorize_member_join(targetUserConnection, {});
  typia.assert(targetUserAuth);
  // Step 4: Owner creates a ban on the target user
  const banCreateBody = {
    memberId: targetUserAuth.id,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    expiresAt: null,
  } satisfies ICommunityPlatformBan.ICreate;
  const createdBan =
    await generate_random_community_platform_member_bans_create(
      ownerConnection,
      {
        body: banCreateBody,
        params: { communityId: community.id },
      },
    );
  typia.assert(createdBan);
  // Step 5: Owner retrieves the ban using the returned ban ID
  const retrievedBan = await api.functional.communityPlatform.member.bans.at(
    ownerConnection,
    {
      communityId: community.id,
      banId: createdBan.id,
    },
  );
  typia.assert(retrievedBan);
  // Step 6: Validate business logic
  TestValidator.equals("ban id matches", retrievedBan.id, createdBan.id);
  TestValidator.equals(
    "reason matches",
    retrievedBan.reason,
    banCreateBody.reason,
  );
  TestValidator.equals(
    "expires_at is null for permanent ban",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals("unbanned_at is null", retrievedBan.unbanned_at, null);
  TestValidator.equals("active status is true", retrievedBan.active, true);
  TestValidator.equals("deleted_at is null", retrievedBan.deleted_at, null);
  // Step 7: Validate banned member matches target user
  TestValidator.equals(
    "banned member id matches target user",
    retrievedBan.bannedMember.id,
    targetUserAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.bannedMember.username,
    targetUserAuth.username,
  );
  // Step 8: Validate issuing moderator matches community owner
  TestValidator.equals(
    "issuing moderator role type is owner",
    retrievedBan.issuingModeratorRole.roleType,
    "owner",
  );
  TestValidator.equals(
    "issuing moderator member id matches owner",
    retrievedBan.issuingModeratorRole.member.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "issuing moderator assigned by is null for owner",
    retrievedBan.issuingModeratorRole.assignedBy,
    null,
  );
  // Step 9: Validate community matches
  TestValidator.equals(
    "community id matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  // Step 10: Test error case - trying to retrieve non-existent ban should fail
  await TestValidator.error(
    "non-existent ban retrieval should fail",
    async () => {
      await api.functional.communityPlatform.member.bans.at(ownerConnection, {
        communityId: community.id,
        banId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Step 11: Test authorization - target user cannot retrieve ban they don't own
  await TestValidator.error("non-moderator cannot retrieve ban", async () => {
    await api.functional.communityPlatform.member.bans.at(
      targetUserConnection,
      {
        communityId: community.id,
        banId: createdBan.id,
      },
    );
  });
}
