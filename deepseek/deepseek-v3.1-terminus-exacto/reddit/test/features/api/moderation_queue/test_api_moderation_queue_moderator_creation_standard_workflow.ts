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
 * Test successful creation of a moderation queue item by a moderator for
 * standard content review workflow. Validates that moderators can create queue
 * items for community-specific moderation tasks with proper queue type
 * assignment, priority level setting, and SLA deadline calculation.
 */
export async function test_api_moderation_queue_moderator_creation_standard_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create member account for report submission
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member submits a moderation report
  const report =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "spam",
          target_type: "post",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 3: Create moderator account for queue management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator creates a moderation queue item
  const queueItem =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "reports",
          priority_level: "medium",
          status: "pending",
          processing_time_minutes: typia.random<number & tags.Type<"int32">>(),
          sla_deadline: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
          moderationReport: {
            id: report.id,
            report_type: report.report_type,
            status: report.status,
            created_at: report.created_at,
          } satisfies ICommunityPlatformModerationReport.ISummary,
        } satisfies ICommunityPlatformModerationQueue.ICreate,
      },
    );
  typia.assert(queueItem);

  // Step 5: Validate queue item properties
  TestValidator.equals(
    "queue type should be reports",
    queueItem.queue_type,
    "reports",
  );
  TestValidator.equals(
    "priority level should be medium",
    queueItem.priority_level,
    "medium",
  );
  TestValidator.equals("status should be pending", queueItem.status, "pending");
  TestValidator.predicate(
    "created_at should be set",
    queueItem.created_at !== undefined,
  );

  // Validate relationship with moderation report
  TestValidator.equals(
    "moderation report ID should match",
    queueItem.moderationReport?.id,
    report.id,
  );
  TestValidator.equals(
    "moderation report type should match",
    queueItem.moderationReport?.report_type,
    report.report_type,
  );
}
