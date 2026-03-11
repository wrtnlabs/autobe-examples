import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_admin_communities_bans_create } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

/**
 * Test retrieval of a ban record for a user who has been unbanned.
 *
 * Scenario:
 * 1. Admin joins and logs in
 * 2. Admin creates a community
 * 3. Member joins and logs in
 * 4. Admin bans member from community
 * 5. Admin unban member
 * 6. Retrieve ban record and verify it includes deletedAt timestamp
 * 7. Validate all ban record fields are preserved
 */
export async function test_api_ban_retrieve_unbanned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: "1234",
    },
  });
  // 3. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member setup - join account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "1234",
    },
  });
  typia.assert(memberJoinResult);
  // 5. Member login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "1234",
    },
  });
  // 6. Admin bans member from community
  const banRecord =
    await api.functional.redditPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          userId: memberJoinResult.id,
          expiresAt: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  const createdAt = banRecord.createdAt;
  // 7. Admin unban member
  const unbanResponse =
    await api.functional.redditPlatform.admin.communities.bans.putByCommunityidAndBanid(
      adminConnection,
      {
        communityId: community.id,
        banId: banRecord.id,
        body: {
          unbanReason: "Test: unban for retrieve test",
        } satisfies IRedditPlatformCommunityBan.IUnban,
      },
    );
  typia.assert(unbanResponse);
  const deletedAt = unbanResponse.deletedAt;
  typia.assertGuard(deletedAt !== null);
  // 8. Retrieve ban record after unban
  const retrievedBan =
    await api.functional.redditPlatform.admin.communities.bans.at(
      adminConnection,
      {
        communityId: community.id,
        banId: banRecord.id,
      },
    );
  typia.assert(retrievedBan);
  // 9. Validate ban record structure
  TestValidator.equals(
    "ban id preserved after unban",
    retrievedBan.id,
    banRecord.id,
  );
  // 10. Validate community reference
  TestValidator.equals(
    "community reference preserved",
    retrievedBan.community.id,
    community.id,
  );
  // 11. Validate author (banned user) reference
  TestValidator.equals(
    "author reference preserved",
    retrievedBan.author.id,
    memberJoinResult.id,
  );
  // 12. Validate createdAt matches original ban issuance
  TestValidator.equals(
    "createdAt matches original ban time",
    retrievedBan.createdAt,
    createdAt,
  );
  // 13. Validate deletedAt is set and valid
  TestValidator.predicate(
    "deletedAt is set after unban",
    deletedAt !== null && deletedAt !== undefined,
  );
  // 14. Validate deletedAt is after createdAt
  const createdAtDate = new Date(createdAt);
  const deletedAtDate = new Date(deletedAt!);
  TestValidator.predicate(
    "deletedAt is after createdAt",
    deletedAtDate.getTime() > createdAtDate.getTime(),
  );
  // 15. Validate expiresAt preserved (should be null for permanent ban)
  TestValidator.equals(
    "expiresAt preserved as null for permanent ban",
    retrievedBan.expiresAt,
    null,
  );
  // 16. Validate updatedAt is updated
  TestValidator.predicate(
    "updatedAt exists",
    retrievedBan.updatedAt !== undefined && retrievedBan.updatedAt !== null,
  );
}
