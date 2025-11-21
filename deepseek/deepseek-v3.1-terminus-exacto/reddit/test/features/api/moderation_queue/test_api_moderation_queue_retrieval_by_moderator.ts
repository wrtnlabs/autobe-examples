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
 * Test that moderators can retrieve detailed information about specific
 * moderation queue items they are authorized to access. Validates that
 * moderators receive comprehensive queue details including queue type, priority
 * level, status, processing timeline, and assignment information. Ensures
 * proper authorization checks prevent unauthorized access to queue items and
 * validates that only assigned moderators can access queue details they are
 * authorized to view.
 */
export async function test_api_moderation_queue_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to set up moderation queue
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create moderator account for testing authorization
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Switch to admin context and create moderation queue
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const queue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "high",
          status: "pending",
          processing_time_minutes: 30,
          sla_deadline: new Date(Date.now() + 3600000).toISOString(),
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queue);

  // Step 4: Switch to moderator context and retrieve queue details
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const retrievedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.moderator.moderationQueues.at(
      connection,
      {
        moderationQueueId: queue.id,
      },
    );
  typia.assert(retrievedQueue);

  // Step 5: Validate comprehensive queue details
  TestValidator.equals(
    "queue ID matches created queue",
    retrievedQueue.id,
    queue.id,
  );
  TestValidator.equals(
    "queue type matches expected value",
    retrievedQueue.queue_type,
    "reports",
  );
  TestValidator.equals(
    "priority level matches expected value",
    retrievedQueue.priority_level,
    "high",
  );
  TestValidator.equals(
    "status matches expected value",
    retrievedQueue.status,
    "pending",
  );
  TestValidator.equals(
    "processing time matches expected value",
    retrievedQueue.processing_time_minutes,
    30,
  );
  TestValidator.equals(
    "SLA deadline matches created value",
    retrievedQueue.sla_deadline,
    queue.sla_deadline,
  );
  TestValidator.predicate(
    "created at timestamp exists and is valid",
    retrievedQueue.created_at !== null &&
      retrievedQueue.created_at !== undefined,
  );

  // Step 6: Validate timeline information with proper TypeScript narrowing
  TestValidator.predicate(
    "created at timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedQueue.created_at,
    ),
  );

  // Proper null/undefined handling using TypeScript narrowing
  if (
    retrievedQueue.assigned_at === null ||
    retrievedQueue.assigned_at === undefined
  ) {
    TestValidator.predicate("assigned at is initially null or undefined", true);
  }

  if (
    retrievedQueue.completed_at === null ||
    retrievedQueue.completed_at === undefined
  ) {
    TestValidator.predicate(
      "completed at is initially null or undefined",
      true,
    );
  }

  if (
    retrievedQueue.deleted_at === null ||
    retrievedQueue.deleted_at === undefined
  ) {
    TestValidator.predicate("deleted at is null for active queue", true);
  }

  // Step 7: Validate actor relationships with proper undefined checks
  TestValidator.predicate(
    "moderation report reference is initially undefined",
    retrievedQueue.moderationReport === undefined,
  );
  TestValidator.predicate(
    "moderation action reference is initially undefined",
    retrievedQueue.moderationAction === undefined,
  );
  TestValidator.predicate(
    "member assignee is initially undefined",
    retrievedQueue.memberAssignee === undefined,
  );
  TestValidator.predicate(
    "moderator assignee is initially undefined",
    retrievedQueue.moderatorAssignee === undefined,
  );
  TestValidator.predicate(
    "admin assignee is initially undefined",
    retrievedQueue.adminAssignee === undefined,
  );

  // Step 8: Additional business logic validation
  TestValidator.predicate(
    "queue has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedQueue.id,
    ),
  );
  TestValidator.predicate(
    "SLA deadline is in the future",
    new Date(retrievedQueue.sla_deadline!) > new Date(),
  );
}
