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
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test creation of a moderation queue item by an administrator with a
 * moderation action reference. Validates queue creation for appeal workflows
 * where previous moderation actions require review. The scenario ensures proper
 * queue type assignment for appeals, appropriate priority level setting based
 * on action severity, and correct SLA deadline calculation. It validates that
 * moderation action references are properly linked and accessible to
 * administrators.
 */
export async function test_api_moderation_queue_admin_creation_with_action(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create moderator account
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

  // 3. Switch to moderator context to create moderation action
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 4. Create a moderation action that will be referenced in the queue
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "temporary_ban",
          target_type: "user",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: "high",
          duration_hours: 24,
          appeal_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 5. Switch back to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://community-platform.example.com/admin",
      referrer: "https://community-platform.example.com",
      session_id: typia.random<string>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 6. Create moderation queue item with moderation action reference
  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "appeals",
          priority_level: "high",
          status: "pending",
          processing_time_minutes: 60,
          sla_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          moderationAction: {
            id: moderationAction.id,
            action_type: moderationAction.action_type,
            status: moderationAction.status,
            created_at: moderationAction.created_at,
          } satisfies ICommunityPlatformModerationAction.ISummary,
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(moderationQueue);

  // 7. Validate queue item properties
  TestValidator.equals(
    "queue type should be appeals",
    moderationQueue.queue_type,
    "appeals",
  );
  TestValidator.equals(
    "priority level should be high",
    moderationQueue.priority_level,
    "high",
  );
  TestValidator.equals(
    "status should be pending",
    moderationQueue.status,
    "pending",
  );
  TestValidator.predicate(
    "SLA deadline should be set",
    moderationQueue.sla_deadline !== undefined,
  );
  TestValidator.predicate(
    "processing time should be set",
    moderationQueue.processing_time_minutes !== undefined,
  );

  // 8. Validate moderation action reference
  TestValidator.equals(
    "moderation action ID should match",
    moderationQueue.moderationAction?.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderation action type should match",
    moderationQueue.moderationAction?.action_type,
    moderationAction.action_type,
  );
  TestValidator.equals(
    "moderation action status should match",
    moderationQueue.moderationAction?.status,
    moderationAction.status,
  );

  // 9. Validate comprehensive queue creation response
  TestValidator.predicate(
    "queue should have valid UUID ID",
    moderationQueue.id.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp should be set",
    moderationQueue.created_at !== undefined,
  );
  TestValidator.equals(
    "queue should reference correct moderation action",
    moderationQueue.moderationAction?.id,
    moderationAction.id,
  );
}
