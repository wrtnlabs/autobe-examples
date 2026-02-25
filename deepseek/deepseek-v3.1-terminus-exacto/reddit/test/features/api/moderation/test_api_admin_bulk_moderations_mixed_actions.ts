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

export async function test_api_admin_bulk_moderations_mixed_actions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a comprehensive moderation action with mixed characteristics
  const moderationAction: ICommunityPlatformModerationQueue.ICreate = {
    status: "pending",
    priority: "high",
    community_platform_post_id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_comment_id: null,
    resolution: "deleted",
    resolution_reason: "Violation of community guidelines - spam content",
  };
  // 3. Submit bulk moderation request
  const batchResponse =
    await api.functional.communityPlatform.admin.bulk.moderations.create(
      adminConnection,
      {
        body: moderationAction,
      },
    );
  typia.assert(batchResponse);
  // 4. Validate comprehensive response structure
  TestValidator.equals(
    "batch response has valid UUID ID",
    typeof batchResponse.id,
    "string",
  );
  TestValidator.predicate(
    "batch response has valid status",
    ["pending", "assigned", "in-review", "resolved"].includes(
      batchResponse.status,
    ),
  );
  TestValidator.predicate(
    "batch response has valid priority",
    ["low", "normal", "high", "critical"].includes(batchResponse.priority),
  );
  TestValidator.predicate(
    "batch response has ISO datetime creation timestamp",
    batchResponse.created_at.includes("T") &&
      batchResponse.created_at.includes("Z"),
  );
  // 5. Validate resolution details when present
  if (
    batchResponse.resolution !== null &&
    batchResponse.resolution !== undefined
  ) {
    TestValidator.predicate(
      "resolution has corresponding detailed reason",
      batchResponse.resolution_reason !== null &&
        batchResponse.resolution_reason !== undefined &&
        batchResponse.resolution_reason.length > 10,
    );
  }
  // 6. Test workflow timestamps progression
  if (
    batchResponse.assigned_at !== null &&
    batchResponse.assigned_at !== undefined
  ) {
    TestValidator.predicate(
      "assignment timestamp is valid ISO format",
      batchResponse.assigned_at.includes("T") &&
        batchResponse.assigned_at.includes("Z"),
    );
  }
  if (
    batchResponse.review_started_at !== null &&
    batchResponse.review_started_at !== undefined
  ) {
    TestValidator.predicate(
      "review start timestamp is valid ISO format",
      batchResponse.review_started_at.includes("T") &&
        batchResponse.review_started_at.includes("Z"),
    );
  }
  if (
    batchResponse.resolved_at !== null &&
    batchResponse.resolved_at !== undefined
  ) {
    TestValidator.predicate(
      "resolution timestamp is valid ISO format",
      batchResponse.resolved_at.includes("T") &&
        batchResponse.resolved_at.includes("Z"),
    );
    // Validate that resolution timestamp comes after creation
    const created = new Date(batchResponse.created_at);
    const resolved = new Date(batchResponse.resolved_at);
    TestValidator.predicate(
      "resolution occurs after creation",
      resolved.getTime() >= created.getTime(),
    );
  }
  // 7. Test error handling for invalid permissions scenario
  await TestValidator.error(
    "should fail when targeting non-existent community",
    async () => {
      const invalidAction: ICommunityPlatformModerationQueue.ICreate = {
        status: "pending",
        priority: "high",
        community_platform_post_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        resolution: "deleted",
        resolution_reason: "Test invalid permission",
      };
      await api.functional.communityPlatform.admin.bulk.moderations.create(
        adminConnection,
        {
          body: invalidAction,
        },
      );
    },
  );
}
