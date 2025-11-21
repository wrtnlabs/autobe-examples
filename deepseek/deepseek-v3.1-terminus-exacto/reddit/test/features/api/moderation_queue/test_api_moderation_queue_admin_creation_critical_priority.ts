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
 * Test creation of a moderation queue item with critical priority level by an
 * administrator. Validates that critical priority items receive immediate
 * attention flags and shorter SLA deadlines. The scenario ensures critical
 * items bypass normal assignment queues and are immediately visible to all
 * available moderators. Tests proper priority level validation and SLA
 * calculation for urgent moderation tasks requiring immediate action.
 */
export async function test_api_moderation_queue_admin_creation_critical_priority(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authorization context
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

  // Step 2: Create member account to submit moderation report
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/community",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Submit moderation report as member
  const report: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "user",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          priority_level: "critical",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Switch to administrator context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create critical priority moderation queue item referencing the report
  const criticalQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.admin.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "critical",
          status: "pending",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<30>
          >() satisfies number as number,
          sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes SLA for critical
          moderationReport: {
            id: report.id,
            report_type: report.report_type,
            status: report.status,
            created_at: report.created_at,
          } satisfies ICommunityPlatformModerationReport.ISummary,
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(criticalQueue);

  // Step 6: Validate queue item properties including SLA deadlines and priority flags
  TestValidator.equals(
    "queue type should be reports",
    criticalQueue.queue_type,
    "reports",
  );
  TestValidator.equals(
    "priority level should be critical",
    criticalQueue.priority_level,
    "critical",
  );
  TestValidator.equals(
    "status should be pending",
    criticalQueue.status,
    "pending",
  );
  TestValidator.predicate(
    "SLA deadline should be set",
    criticalQueue.sla_deadline !== undefined &&
      criticalQueue.sla_deadline !== null,
  );
  TestValidator.predicate(
    "processing time should be reasonable",
    criticalQueue.processing_time_minutes !== undefined &&
      criticalQueue.processing_time_minutes >= 5 &&
      criticalQueue.processing_time_minutes <= 30,
  );

  // Step 7: Verify critical priority specific validations
  TestValidator.predicate(
    "created at timestamp should be set",
    criticalQueue.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderation report reference should exist",
    criticalQueue.moderationReport !== undefined,
  );
  TestValidator.equals(
    "moderation report ID should match",
    criticalQueue.moderationReport?.id,
    report.id,
  );

  // Additional validation: Ensure critical items have shorter SLA than normal
  const slaDeadline = new Date(criticalQueue.sla_deadline!);
  const creationTime = new Date(criticalQueue.created_at);
  const slaDuration = slaDeadline.getTime() - creationTime.getTime();
  TestValidator.predicate(
    "critical SLA should be shorter than 1 hour",
    slaDuration <= 60 * 60 * 1000,
  );
}
