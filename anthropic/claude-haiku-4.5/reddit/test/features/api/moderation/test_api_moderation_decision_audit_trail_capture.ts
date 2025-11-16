import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_moderation_decision_audit_trail_capture(
  connection: api.IConnection,
) {
  // Create a moderator account for making decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorHref = typia.random<string & tags.Format<"uri">>();
  const moderatorReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(10),
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Use a valid UUID for the report that would exist in the system
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Create decision on the report with audit trail capture
  const decisionBody = {
    action_type: "remove_content" as const,
    reason:
      "Content violates community standards and must be removed from platform.",
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: decisionBody,
      },
    );
  typia.assert(decision);

  // Verify audit trail timestamps are captured correctly
  TestValidator.predicate(
    "decision created_at is present",
    decision.created_at !== null && decision.created_at !== undefined,
  );
  TestValidator.predicate(
    "decision updated_at is present",
    decision.updated_at !== null && decision.updated_at !== undefined,
  );

  // Verify created_at and updated_at are equal on initial creation (immutable state)
  TestValidator.equals(
    "updated_at equals created_at on creation",
    decision.created_at,
    decision.updated_at,
  );

  // Verify deleted_at is null for active decision (soft-delete not applied)
  TestValidator.equals(
    "deleted_at is null for active decision",
    decision.deleted_at,
    null,
  );

  // Verify moderator identity is captured from JWT authentication token
  TestValidator.predicate(
    "moderator id captured in audit trail",
    decision.moderator !== null && decision.moderator !== undefined,
  );
  TestValidator.equals(
    "moderator username matches authenticated moderator",
    decision.moderator.username,
    moderator.username,
  );
  TestValidator.equals(
    "moderator id matches authenticated moderator",
    decision.moderator.id,
    moderator.id,
  );

  // Verify decision data immutability - core fields are preserved as created
  TestValidator.equals(
    "decision action_type immutable from creation",
    decision.action_type,
    decisionBody.action_type,
  );
  TestValidator.equals(
    "decision reason immutable from creation",
    decision.reason,
    decisionBody.reason,
  );

  // Verify report reference is included in decision audit trail
  TestValidator.predicate(
    "report included in decision audit trail",
    decision.report !== null && decision.report !== undefined,
  );
  TestValidator.equals(
    "report id in decision matches request",
    decision.report.id,
    reportId,
  );

  // Test with suspension action to verify suspension_duration_days is captured in audit trail
  const suspensionReportId = typia.random<string & tags.Format<"uuid">>();
  const suspensionDecisionBody = {
    action_type: "suspend_user" as const,
    reason:
      "User engaged in repeated harassment violations and requires account suspension.",
    suspension_duration_days: 7,
  } satisfies ICommunityPlatformReportDecision.ICreate;

  const suspensionDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: suspensionReportId,
        body: suspensionDecisionBody,
      },
    );
  typia.assert(suspensionDecision);

  // Verify suspension decision audit trail
  TestValidator.equals(
    "suspension action_type captured",
    suspensionDecision.action_type,
    "suspend_user",
  );
  TestValidator.equals(
    "suspension duration captured in audit trail",
    suspensionDecision.suspension_duration_days,
    7,
  );
  TestValidator.equals(
    "suspension created_at equals updated_at",
    suspensionDecision.created_at,
    suspensionDecision.updated_at,
  );
  TestValidator.equals(
    "suspension deleted_at null for active decision",
    suspensionDecision.deleted_at,
    null,
  );
}
