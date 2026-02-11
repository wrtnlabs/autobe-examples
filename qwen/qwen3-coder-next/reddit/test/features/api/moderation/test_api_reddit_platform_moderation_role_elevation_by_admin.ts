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

export async function test_api_reddit_platform_moderation_role_elevation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(2),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create community and moderation assignment for testing
  // Use the provided utility function to create a moderation assignment
  const moderation =
    await generate_random_reddit_platform_admin_reddit_platform_moderations_assign_moderator(
      adminConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          user_id: adminUser.id,
          role: "MODERATOR",
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(moderation);
  TestValidator.equals(
    "initial role is MODERATOR",
    moderation.role,
    "MODERATOR",
  );
  // 3. Elevate moderator to owner by admin
  const updatedModeration =
    await api.functional.redditPlatform.admin.redditPlatform.moderations.update(
      adminConnection,
      {
        moderationId: moderation.id,
        body: {
          role: "OWNER",
        } satisfies IRedditPlatformModeration.IUpdate,
      },
    );
  typia.assert(updatedModeration);
  // 4. Validate the elevation
  TestValidator.equals(
    "role elevated to OWNER",
    updatedModeration.role,
    "OWNER",
  );
  TestValidator.equals(
    "community remains same",
    updatedModeration.community_id,
    moderation.community_id,
  );
  TestValidator.equals(
    "user remains same",
    updatedModeration.user_id,
    adminUser.id,
  );
  TestValidator.equals("id remains same", updatedModeration.id, moderation.id);
  // Verify relations are preserved
  TestValidator.equals(
    "community name preserved",
    updatedModeration.community.name,
    moderation.community.name,
  );
  TestValidator.equals(
    "user username preserved",
    updatedModeration.user.username,
    moderation.user.username,
  );
}
