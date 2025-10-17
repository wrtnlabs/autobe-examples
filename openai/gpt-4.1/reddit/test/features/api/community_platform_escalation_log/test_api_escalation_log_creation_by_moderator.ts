import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test the ability of a newly registered moderator to escalate an unresolved
 * report to administrators.
 *
 * This test checks:
 *
 * - That only an authorized moderator can create an escalation log for a given
 *   report.
 * - The escalation log is created with the proper references (initiator and
 *   report IDs, proper reason, status).
 * - Attempts by unauthorized roles (such as non-moderators) are rejected.
 * - Invalid references (e.g., non-existent report) are rejected.
 * - The escalation log creation flow is auditable and correct.
 *
 * Steps:
 *
 * 1. Register a new moderator for a fake community
 * 2. Simulate a report to escalate (this will be a random UUID for testing)
 * 3. Moderator submits an escalation log for this report
 * 4. Validate that escalation succeeds and audit fields are set
 * 5. Try escalation with invalid report reference (should be rejected)
 * 6. Try escalation as a random unauthenticated user (should be rejected)
 */
export async function test_api_escalation_log_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register new moderator for a fake community (simulate unique addresses)
  const moderatorJoin = typia.random<ICommunityPlatformModerator.IJoin>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoin,
    });
  typia.assert(moderator);

  // 2. Simulate an existing moderation report (randomly generate)
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  // Here, in a real test, we would create a valid report entry and get its ID

  // 3. Moderator submits escalation log for this report
  const escalationReason = RandomGenerator.paragraph({ sentences: 6 });
  const escalationBody = {
    initiator_id: moderator.member_id,
    report_id: fakeReportId,
    escalation_reason: escalationReason,
    status: "pending",
  } satisfies ICommunityPlatformEscalationLog.ICreate;

  const log: ICommunityPlatformEscalationLog =
    await api.functional.communityPlatform.moderator.escalationLogs.create(
      connection,
      {
        body: escalationBody,
      },
    );
  typia.assert(log);
  TestValidator.equals(
    "escalation log initiator matches moderator member_id",
    log.initiator_id,
    moderator.member_id,
  );
  TestValidator.equals(
    "escalation log report matches input report_id",
    log.report_id,
    fakeReportId,
  );
  TestValidator.equals(
    "escalation log reason matches input",
    log.escalation_reason,
    escalationReason,
  );
  TestValidator.equals(
    "escalation log status matches input",
    log.status,
    escalationBody.status,
  );

  // 4. Attempt escalation with an invalid (random) report reference (should fail)
  const invalidReportId = typia.random<string & tags.Format<"uuid">>();
  const escalationBodyInvalid = {
    initiator_id: moderator.member_id,
    report_id: invalidReportId,
    escalation_reason: RandomGenerator.paragraph({ sentences: 4 }),
    status: "pending",
  } satisfies ICommunityPlatformEscalationLog.ICreate;
  await TestValidator.error(
    "escalation with invalid report ID should be rejected",
    async () => {
      await api.functional.communityPlatform.moderator.escalationLogs.create(
        connection,
        {
          body: escalationBodyInvalid,
        },
      );
    },
  );

  // 5. Attempt escalation as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "escalation as unauthenticated user should be rejected",
    async () => {
      await api.functional.communityPlatform.moderator.escalationLogs.create(
        unauthConn,
        {
          body: escalationBody,
        },
      );
    },
  );
}
