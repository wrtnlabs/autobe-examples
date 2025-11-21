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
 * Test creation of a moderation queue item by a moderator for automated flag
 * processing.
 *
 * This test validates the complete workflow of automated flag queue creation,
 * including member registration, automated flag report creation, moderator
 * authentication, and queue item creation with proper priority assignment and
 * SLA deadlines.
 *
 * The scenario ensures that automated flags are properly processed through the
 * moderation system with appropriate urgency levels and service level
 * agreements.
 */
export async function test_api_moderation_queue_moderator_creation_automated_flags(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member to establish user context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a moderation report representing an automated flag
  const report =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "spam",
          target_type: "post",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          description: "Automated flag for spam content detection",
          priority_level: "high",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 3: Create and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create moderation queue item for automated flag processing
  const queueItem =
    await api.functional.communityPlatform.moderator.moderationQueues.create(
      connection,
      {
        body: {
          queue_type: "automated_flags",
          priority_level: "high",
          status: "pending",
          processing_time_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<60>
          >(),
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
    "queue type should be automated_flags",
    queueItem.queue_type,
    "automated_flags",
  );
  TestValidator.equals(
    "priority level should be high",
    queueItem.priority_level,
    "high",
  );
  TestValidator.equals("status should be pending", queueItem.status, "pending");
  TestValidator.predicate(
    "processing time should be positive",
    queueItem.processing_time_minutes !== undefined &&
      queueItem.processing_time_minutes > 0,
  );
  TestValidator.predicate(
    "SLA deadline should be in the future",
    queueItem.sla_deadline !== undefined &&
      new Date(queueItem.sla_deadline) > new Date(),
  );
  TestValidator.equals(
    "moderation report ID should match",
    queueItem.moderationReport?.id,
    report.id,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid",
    queueItem.created_at !== undefined &&
      new Date(queueItem.created_at) <= new Date(),
  );
}
