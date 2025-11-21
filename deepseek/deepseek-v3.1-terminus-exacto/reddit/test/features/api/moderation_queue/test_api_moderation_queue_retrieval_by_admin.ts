import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that administrators can retrieve detailed information about any
 * moderation queue item in the system, regardless of assignment status.
 * Validates comprehensive access to all queue fields including queue type,
 * priority level, status, SLA deadlines, and processing timeline. Ensures
 * administrators can monitor queue performance and intervene when necessary for
 * escalated items or workflow optimization.
 */
export async function test_api_moderation_queue_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish full system access privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "secureAdminPassword123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a moderation queue item for the administrator to retrieve and examine
  const queueTypes = [
    "reports",
    "appeals",
    "automated_flags",
    "user_reviews",
    "content_reviews",
  ] as const;
  const priorityLevels = ["low", "medium", "high", "critical"] as const;
  const statusValues = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "escalated",
  ] as const;

  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: RandomGenerator.pick(queueTypes),
          priority_level: RandomGenerator.pick(priorityLevels),
          status: RandomGenerator.pick(statusValues),
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >(),
          sla_deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // Step 3: Retrieve the moderation queue item and validate comprehensive access
  const retrievedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.at(
      connection,
      {
        moderationQueueId: moderationQueue.id,
      },
    );
  typia.assert(retrievedQueue);

  // Step 4: Validate that all fields are correctly retrieved and match the created queue
  TestValidator.equals(
    "queue ID matches",
    retrievedQueue.id,
    moderationQueue.id,
  );
  TestValidator.equals(
    "queue type matches",
    retrievedQueue.queue_type,
    moderationQueue.queue_type,
  );
  TestValidator.equals(
    "priority level matches",
    retrievedQueue.priority_level,
    moderationQueue.priority_level,
  );
  TestValidator.equals(
    "status matches",
    retrievedQueue.status,
    moderationQueue.status,
  );
  TestValidator.equals(
    "processing time minutes matches",
    retrievedQueue.processing_time_minutes,
    moderationQueue.processing_time_minutes,
  );
  TestValidator.equals(
    "SLA deadline matches",
    retrievedQueue.sla_deadline,
    moderationQueue.sla_deadline,
  );
  TestValidator.equals(
    "created at timestamp matches",
    retrievedQueue.created_at,
    moderationQueue.created_at,
  );

  // Validate that all optional fields are present and correctly structured
  TestValidator.predicate(
    "queue has valid created timestamp",
    retrievedQueue.created_at !== undefined &&
      retrievedQueue.created_at !== null,
  );

  // Validate assignment timestamps if present using proper nullable type handling
  if (
    retrievedQueue.assigned_at !== null &&
    retrievedQueue.assigned_at !== undefined
  ) {
    const assignedAt = typia.assert(retrievedQueue.assigned_at!);
    TestValidator.predicate(
      "assigned at is valid timestamp",
      assignedAt.length > 0,
    );
  }

  if (
    retrievedQueue.completed_at !== null &&
    retrievedQueue.completed_at !== undefined
  ) {
    const completedAt = typia.assert(retrievedQueue.completed_at!);
    TestValidator.predicate(
      "completed at is valid timestamp",
      completedAt.length > 0,
    );
  }

  // Validate that soft deletion timestamp is properly handled
  if (
    retrievedQueue.deleted_at !== null &&
    retrievedQueue.deleted_at !== undefined
  ) {
    const deletedAt = typia.assert(retrievedQueue.deleted_at!);
    TestValidator.predicate(
      "deleted at is valid timestamp",
      deletedAt.length > 0,
    );
  }

  // Validate that all reference fields maintain proper structure
  if (
    retrievedQueue.moderationReport !== null &&
    retrievedQueue.moderationReport !== undefined
  ) {
    const report = typia.assert(retrievedQueue.moderationReport!);
    TestValidator.predicate(
      "moderation report has valid ID",
      report.id.length > 0,
    );
  }

  if (
    retrievedQueue.moderationAction !== null &&
    retrievedQueue.moderationAction !== undefined
  ) {
    const action = typia.assert(retrievedQueue.moderationAction!);
    TestValidator.predicate(
      "moderation action has valid ID",
      action.id.length > 0,
    );
  }

  // Validate assignment references if present
  if (
    retrievedQueue.memberAssignee !== null &&
    retrievedQueue.memberAssignee !== undefined
  ) {
    const member = typia.assert(retrievedQueue.memberAssignee!);
    TestValidator.predicate(
      "member assignee has valid ID",
      member.id.length > 0,
    );
  }

  if (
    retrievedQueue.moderatorAssignee !== null &&
    retrievedQueue.moderatorAssignee !== undefined
  ) {
    const moderator = typia.assert(retrievedQueue.moderatorAssignee!);
    TestValidator.predicate(
      "moderator assignee has valid ID",
      moderator.id.length > 0,
    );
  }

  if (
    retrievedQueue.adminAssignee !== null &&
    retrievedQueue.adminAssignee !== undefined
  ) {
    const adminAssignee = typia.assert(retrievedQueue.adminAssignee!);
    TestValidator.predicate(
      "admin assignee has valid ID",
      adminAssignee.id.length > 0,
    );
  }
}
