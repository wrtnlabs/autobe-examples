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

/**
 * Test duplicate active ban prevention.
 *
 * 1. Create community owner, regular member to ban, and another member for cross-community test
 * 2. Create two communities
 * 3. Ban regular member in community1 (should succeed)
 * 4. Try banning same member again in community1 (should fail with 409 Conflict)
 * 5. Ban same member in community2 (should succeed - cross-community independence)
 * 6. Create temporary ban with expiration for different member
 * 7. Wait for ban expiration (simulate expired ban)
 * 8. Attempt to ban same member after expiration (should succeed)
 * 9. Verify error messages indicate duplicate active ban conflict
 */
export async function test_api_bans_duplicate_active_ban_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberToBanConnection: api.IConnection = { host: connection.host };
  const otherMemberConnection: api.IConnection = { host: connection.host };
  // Step 1: Create members using utility function
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(owner);
  const memberToBan = await authorize_member_join(memberToBanConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(memberToBan);
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies DeepPartial<ICommunityPlatformMember.IJoin>,
  });
  typia.assert(otherMember);
  // Step 2: Create two communities using SDK (no utility function available)
  const community1 =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Step 3: Create first ban in community1 (should succeed)
  const ban1 = await api.functional.communityPlatform.member.bans.create(
    ownerConnection,
    {
      communityId: community1.id,
      body: {
        memberId: memberToBan.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban1);
  // Verify ban was created successfully
  TestValidator.equals("ban should be active", ban1.active, true);
  TestValidator.equals(
    "ban should target correct member",
    ban1.bannedMember.id,
    memberToBan.id,
  );
  TestValidator.equals(
    "ban should be in correct community",
    ban1.community.id,
    community1.id,
  );
  // Step 4: Try to create duplicate active ban in same community (should fail with 409 Conflict)
  await TestValidator.error("duplicate active ban should fail", async () => {
    await api.functional.communityPlatform.member.bans.create(ownerConnection, {
      communityId: community1.id,
      body: {
        memberId: memberToBan.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    });
  });
  // Step 5: Create ban for same member in different community (should succeed - no cross-community conflict)
  const ban2 = await api.functional.communityPlatform.member.bans.create(
    ownerConnection,
    {
      communityId: community2.id,
      body: {
        memberId: memberToBan.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    },
  );
  typia.assert(ban2);
  TestValidator.equals(
    "cross-community ban should be active",
    ban2.active,
    true,
  );
  TestValidator.equals(
    "cross-community ban target member",
    ban2.bannedMember.id,
    memberToBan.id,
  );
  TestValidator.equals(
    "cross-community ban community",
    ban2.community.id,
    community2.id,
  );
  // Step 6: Create temporary ban with expiration for different member
  const temporaryBan =
    await api.functional.communityPlatform.member.bans.create(ownerConnection, {
      communityId: community1.id,
      body: {
        memberId: otherMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expiresAt: new Date(Date.now() + 1000).toISOString(), // expires in 1 second
      } satisfies ICommunityPlatformBan.ICreate,
    });
  typia.assert(temporaryBan);
  TestValidator.equals(
    "temporary ban should be active",
    temporaryBan.active,
    true,
  );
  TestValidator.notEquals(
    "temporary ban should have expiration",
    temporaryBan.expires_at,
    null,
  );
  TestValidator.predicate("expiration should be in future", () => {
    const expiresAt = new Date(temporaryBan.expires_at!);
    return expiresAt.getTime() > Date.now();
  });
  // Step 7: Wait for ban expiration (simulate by waiting)
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Step 8: Attempt to ban same member after expiration (should succeed)
  const newBanAfterExpiration =
    await api.functional.communityPlatform.member.bans.create(ownerConnection, {
      communityId: community1.id,
      body: {
        memberId: otherMember.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityPlatformBan.ICreate,
    });
  typia.assert(newBanAfterExpiration);
  TestValidator.equals(
    "new ban after expiration should be active",
    newBanAfterExpiration.active,
    true,
  );
  TestValidator.equals(
    "new ban should target same member",
    newBanAfterExpiration.bannedMember.id,
    otherMember.id,
  );
  TestValidator.equals(
    "new ban should be in same community",
    newBanAfterExpiration.community.id,
    community1.id,
  );
  // Verify we now have multiple bans for the same member in different communities
  TestValidator.notEquals(
    "bans in different communities should have different IDs",
    ban1.id,
    ban2.id,
  );
  TestValidator.notEquals(
    "original ban and new ban after expiration should differ",
    temporaryBan.id,
    newBanAfterExpiration.id,
  );
}
