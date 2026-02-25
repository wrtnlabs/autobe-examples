import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_bulk_moderations_create } from "../../../generate/generate_random_community_platform_admin_bulk_moderations_create";
import { prepare_random_community_platform_moderation_queue } from "../../../prepare/prepare_random_community_platform_moderation_queue";

export async function test_api_admin_bulk_moderations_partial_failures(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create a valid moderation queue item
  const validModeration =
    await generate_random_community_platform_admin_bulk_moderations_create(
      adminConnection,
      {
        body: {
          status: "pending",
          priority: "normal",
          community_platform_post_id: null,
          community_platform_comment_id: null,
          resolution: "approved",
          resolution_reason: "Test valid moderation",
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(validModeration);
  // Test that the system handles invalid references gracefully
  // by creating moderation items with non-existent content
  const moderationWithInvalidPost =
    await generate_random_community_platform_admin_bulk_moderations_create(
      adminConnection,
      {
        body: {
          status: "pending",
          priority: "high",
          community_platform_post_id: typia.random<
            string & tags.Format<"uuid">
          >(), // Non-existent post
          community_platform_comment_id: null,
          resolution: null,
          resolution_reason: null,
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationWithInvalidPost);
  // Validate that both moderation items were created successfully
  // demonstrating that invalid references don't prevent creation
  TestValidator.equals(
    "first moderation has valid status",
    validModeration.status,
    "pending",
  );
  TestValidator.equals(
    "second moderation has valid status",
    moderationWithInvalidPost.status,
    "pending",
  );
  TestValidator.notEquals(
    "moderations have different IDs",
    validModeration.id,
    moderationWithInvalidPost.id,
  );
  // Test that the system processes moderation items independently
  // by verifying that creation timestamps are sequential
  TestValidator.predicate(
    "moderations created in sequence",
    new Date(validModeration.created_at) <=
      new Date(moderationWithInvalidPost.created_at),
  );
}
