import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
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
import { generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_moderation } from "../../../prepare/prepare_random_reddit_platform_moderation";

export async function test_api_reddit_platform_moderation_assign_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create non-owner admin user (will attempt unauthorized moderator assignment)
  const nonOwnerAdminConnection: api.IConnection = { host: connection.host };
  const nonOwnerAdmin = await authorize_admin_join(nonOwnerAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(nonOwnerAdmin);
  // 2. Create community owned by different admin (separate from non-owner admin)
  const originalAdminConnection: api.IConnection = { host: connection.host };
  const originalAdmin = await authorize_admin_join(originalAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(originalAdmin);
  // Create community as original admin (community owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      originalAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: "Test community for moderation permission test",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Attempt moderator assignment as non-owner admin (should be rejected)
  await TestValidator.error(
    "non-owner admin cannot assign moderator",
    async () => {
      await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
        nonOwnerAdminConnection,
        {
          body: {
            community_id: community.id,
            user_id: nonOwnerAdmin.id,
            role: "MODERATOR" as const,
          } satisfies IRedditPlatformModeration.ICreate,
        },
      );
    },
  );
  // 4. Verify original admin (community owner) CAN assign moderators
  await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
    originalAdminConnection,
    {
      body: {
        community_id: community.id,
        user_id: nonOwnerAdmin.id,
        role: "MODERATOR" as const,
      } satisfies IRedditPlatformModeration.ICreate,
    },
  );
}
