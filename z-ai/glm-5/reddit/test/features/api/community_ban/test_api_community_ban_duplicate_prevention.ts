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

/**
 * Test that the system prevents creating duplicate active bans for the same member
 * in the same community.
 *
 * Validates the business rule that a member cannot have multiple concurrent
 * active bans in the same community. The system should check for existing
 * active bans (deleted_at is null) before creating a new one.
 */
export async function test_api_community_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner creates account and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Another member registers (who will be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 3. Owner successfully bans the member - first ban succeeds
  const firstBan =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: member.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // Verify first ban is active (deleted_at is null)
  TestValidator.equals("first ban is active", firstBan.deleted_at, null);
  TestValidator.equals("ban member matches", firstBan.member.id, member.id);
  TestValidator.equals(
    "ban community matches",
    firstBan.community.id,
    community.id,
  );
  // 4. Owner attempts to ban the same member again - should be rejected
  // because an active ban already exists for this member in this community
  await TestValidator.error("duplicate active ban prevention", async () => {
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: member.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  });
}
