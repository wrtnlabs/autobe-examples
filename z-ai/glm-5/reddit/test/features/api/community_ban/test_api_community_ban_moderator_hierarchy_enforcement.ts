import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test that a moderator cannot ban another moderator from the same community.
 *
 * This test enforces the moderator hierarchy business rule where only the
 * community owner can ban moderators. Moderators cannot ban other moderators
 * within the same community, preventing power struggles and maintaining
 * clear authority boundaries in community governance.
 *
 * Test Flow:
 * 1. Member A creates a community (becomes owner)
 * 2. Member A appoints Member B as moderator
 * 3. Member A appoints Member C as moderator
 * 4. Member B attempts to ban Member C (should fail with 403)
 */
export async function test_api_community_ban_moderator_hierarchy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A creates community (becomes owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B joins and gets appointed as moderator
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_member_join(moderatorBConnection, {});
  typia.assert(moderatorB);
  await generate_random_community_platform_member_communities_moderators_add_moderator(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { username: moderatorB.member.username },
    },
  );
  // Step 3: Member C joins and gets appointed as moderator
  const moderatorCConnection: api.IConnection = { host: connection.host };
  const moderatorC = await authorize_member_join(moderatorCConnection, {});
  typia.assert(moderatorC);
  await generate_random_community_platform_member_communities_moderators_add_moderator(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { username: moderatorC.member.username },
    },
  );
  // Step 4: Moderator B attempts to ban Moderator C
  // This should fail with 403 Forbidden due to moderator hierarchy
  await TestValidator.httpError(
    "moderator cannot ban another moderator",
    403,
    async () =>
      await api.functional.communityPlatform.member.communities.bans.create(
        moderatorBConnection,
        {
          communityName: community.name,
          body: {
            bannedUserId: moderatorC.member.id,
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      ),
  );
}
