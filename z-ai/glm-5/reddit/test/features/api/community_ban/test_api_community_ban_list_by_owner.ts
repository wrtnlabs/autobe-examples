import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_community_ban_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a community owner can successfully retrieve the paginated list
   * of banned users from their community.
   *
   * Setup:
   * 1. Owner creates a community and subscribes to it for posting permissions
   * 2. Another member subscribes to the community
   * 3. Owner bans that member from the community
   *
   * Execution: Call the ban list endpoint as the authenticated owner
   *
   * Validation: Verify pagination metadata and ban record details
   */
  // 1. Owner setup - create account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Owner subscribes to their community for posting permissions
  const ownerSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      ownerConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(ownerSubscription);
  // 4. Second member setup - create account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 5. Second member subscribes to the community
  const memberSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(memberSubscription);
  // 6. Owner bans the second member
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          bannedUserId: memberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // 7. Owner retrieves the ban list
  const banList =
    await api.functional.communityPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    banList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    banList.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    banList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    banList.pagination.pages >= 1,
  );
  // 9. Validate ban record data
  TestValidator.predicate(
    "ban list should contain at least one ban",
    banList.data.length >= 1,
  );
  // 10. Find the ban we created and validate its details
  const createdBan = banList.data.find((b) => b.id === ban.id);
  TestValidator.predicate(
    "created ban should be found in list",
    createdBan !== undefined,
  );
  if (createdBan) {
    // Validate ban has UUID format id
    TestValidator.predicate(
      "ban id should be UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdBan.id,
      ),
    );
    // Validate created_at is ISO 8601 format
    TestValidator.predicate(
      "created_at should be ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdBan.created_at),
    );
    // Validate deleted_at is null for active bans
    TestValidator.equals(
      "deleted_at should be null for active ban",
      createdBan.deleted_at,
      null,
    );
    // Validate reason is present (we provided one)
    TestValidator.predicate(
      "reason should be present",
      createdBan.reason !== null && createdBan.reason.length > 0,
    );
    // Validate banned user relation
    TestValidator.equals(
      "banned user id should match",
      createdBan.bannedUser.id,
      memberAuth.id,
    );
    TestValidator.predicate(
      "banned user should have username",
      createdBan.bannedUser.username.length > 0,
    );
    TestValidator.predicate(
      "banned user should have display_name",
      createdBan.bannedUser.display_name.length > 0,
    );
    // Validate banning moderator relation
    TestValidator.equals(
      "banning moderator id should match owner",
      createdBan.bannedBy.id,
      ownerAuth.id,
    );
    TestValidator.predicate(
      "banning moderator should have username",
      createdBan.bannedBy.username.length > 0,
    );
    TestValidator.predicate(
      "banning moderator should have display_name",
      createdBan.bannedBy.display_name.length > 0,
    );
  }
  // 11. Validate sorting - results should be sorted by created_at descending
  if (banList.data.length > 1) {
    for (let i = 0; i < banList.data.length - 1; i++) {
      const current = new Date(banList.data[i].created_at).getTime();
      const next = new Date(banList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "bans should be sorted by created_at descending",
        current >= next,
      );
    }
  }
}
