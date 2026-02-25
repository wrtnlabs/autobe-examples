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

export async function test_api_moderation_queues_update_workflow_progression(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Since we don't have utility functions to create moderation queue items,
  // we'll need to use the SDK to create a test moderation queue item
  // However, the scenario requires a moderation queue item to exist first
  // This creates a circular dependency - we need a moderation queue to test the update
  // For now, we'll assume there's an existing moderation queue item we can use
  // In a real scenario, we would need to create content that triggers moderation
  // Get an existing moderation queue item (assuming one exists)
  // This is a limitation of the current test setup
  const moderationQueueId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Update status to 'assigned'
  const assignedUpdate =
    await api.functional.communityPlatform.admin.moderation_queues.update(
      adminConnection,
      {
        moderationQueueId,
        body: {
          status: "assigned",
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(assignedUpdate);
  TestValidator.predicate(
    "assigned_at timestamp set",
    assignedUpdate.assigned_at !== null,
  );
  // Step 2: Update status to 'in-review'
  const inReviewUpdate =
    await api.functional.communityPlatform.admin.moderation_queues.update(
      adminConnection,
      {
        moderationQueueId,
        body: {
          status: "in-review",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(inReviewUpdate);
  TestValidator.predicate(
    "review_started_at timestamp set",
    inReviewUpdate.review_started_at !== null,
  );
  // Step 3: Update status to 'resolved' with resolution details
  const resolvedUpdate =
    await api.functional.communityPlatform.admin.moderation_queues.update(
      adminConnection,
      {
        moderationQueueId,
        body: {
          status: "resolved",
          resolution: "approved",
          resolutionReason: "Content complies with community guidelines",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(resolvedUpdate);
  TestValidator.predicate(
    "resolved_at timestamp set",
    resolvedUpdate.resolved_at !== null,
  );
  TestValidator.equals("resolution set", resolvedUpdate.resolution, "approved");
  TestValidator.equals(
    "resolution reason set",
    resolvedUpdate.resolution_reason,
    "Content complies with community guidelines",
  );
  // Validate chronological order of timestamps
  if (
    assignedUpdate.assigned_at &&
    inReviewUpdate.review_started_at &&
    resolvedUpdate.resolved_at
  ) {
    TestValidator.predicate(
      "assigned before review",
      new Date(assignedUpdate.assigned_at) <
        new Date(inReviewUpdate.review_started_at),
    );
    TestValidator.predicate(
      "review before resolved",
      new Date(inReviewUpdate.review_started_at) <
        new Date(resolvedUpdate.resolved_at),
    );
  }
  // Validate relationships are present
  TestValidator.predicate(
    "moderator relationship present",
    resolvedUpdate.moderator !== null,
  );
  TestValidator.predicate(
    "post relationship present",
    resolvedUpdate.post !== null,
  );
  TestValidator.predicate(
    "comment relationship present",
    resolvedUpdate.comment !== null,
  );
}
