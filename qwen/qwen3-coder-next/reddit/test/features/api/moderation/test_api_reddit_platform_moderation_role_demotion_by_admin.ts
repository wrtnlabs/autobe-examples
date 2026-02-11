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
import { generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator";
import { prepare_random_reddit_platform_moderation } from "../../../prepare/prepare_random_reddit_platform_moderation";

/**
 * Test admin can demote a moderation role from OWNER to MODERATOR.
 * 1. Create admin and authorize
 * 2. Assign a member as OWNER of a community
 * 3. Demote the owner to MODERATOR
 * 4. Verify the role change
 */
export async function test_api_reddit_platform_moderation_role_demotion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create a moderation assignment with OWNER role
  // Since communities API doesn't exist, we'll use assignModerator
  // We need valid UUIDs for community_id and user_id
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Create a moderation assignment with OWNER role
  const ownerModeration =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.assignModerator(
      adminConnection,
      {
        body: {
          community_id: communityId,
          user_id: userId,
          role: "OWNER" as const,
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(ownerModeration);
  TestValidator.equals("initial role is OWNER", ownerModeration.role, "OWNER");
  // 3. Demote the owner to MODERATOR role
  const updatedModeration =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.update(
      adminConnection,
      {
        moderationId: ownerModeration.id,
        body: {
          role: "MODERATOR" as const,
        } satisfies IRedditPlatformModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // 4. Verify the role was successfully demoted
  TestValidator.equals(
    "role demoted to MODERATOR",
    updatedModeration.role,
    "MODERATOR",
  );
  TestValidator.equals(
    "community ID unchanged",
    updatedModeration.community_id,
    communityId,
  );
  TestValidator.equals("user ID unchanged", updatedModeration.user_id, userId);
}
