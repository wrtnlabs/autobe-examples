import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";

/**
 * Validate platform administrator's audit access to escalation log details
 * (escalation log detail view).
 *
 * This test verifies that a platform administrator can see detailed escalation
 * logs regardless of community, with all workflow, status, audit, and
 * participant data.
 *
 * Test steps:
 *
 * 1. Register a member (to act as the reporting user)
 * 2. Register a new admin (platform admin for viewing escalation logs)
 * 3. Member creates a community
 * 4. Member files a report within the community
 * 5. Member (acting as moderator) escalates the report
 * 6. Switch to admin session and retrieve the escalation log detail via GET
 *    /communityPlatform/admin/escalationLogs/{escalationLogId}
 * 7. Validate all escalation log details (fields, correctness, linkage to report
 *    and initiator)
 * 8. Try retrieving a non-existent escalation log (expect error)
 * 9. Switch back to member and validate that insufficient privileges cannot
 *    retrieve escalation log (expect error)
 */
export async function test_api_escalation_log_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "strongpass123",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongAdminPass!@#",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Member files a report (simulate report on a post; required fields only)
  const reportCategoryId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategoryId,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 5. Member (as moderator) creates an escalation log on the report
  const escalationReason = RandomGenerator.paragraph({ sentences: 3 });
  const escalationLog =
    await api.functional.communityPlatform.moderator.escalationLogs.create(
      connection,
      {
        body: {
          initiator_id: member.id,
          report_id: report.id,
          escalation_reason: escalationReason,
          status: "pending",
        } satisfies ICommunityPlatformEscalationLog.ICreate,
      },
    );
  typia.assert(escalationLog);

  // 6. Switch to admin session (assume session switching) and retrieve escalation log detail
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongAdminPass!@#",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const gotEscalationLog: ICommunityPlatformEscalationLog =
    await api.functional.communityPlatform.admin.escalationLogs.at(connection, {
      escalationLogId: escalationLog.id,
    });
  typia.assert(gotEscalationLog);
  TestValidator.equals(
    "escalation log id matches",
    gotEscalationLog.id,
    escalationLog.id,
  );
  TestValidator.equals(
    "report id matches",
    gotEscalationLog.report_id,
    escalationLog.report_id,
  );
  TestValidator.equals(
    "initiator matches",
    gotEscalationLog.initiator_id,
    escalationLog.initiator_id,
  );
  TestValidator.equals(
    "status field",
    gotEscalationLog.status,
    escalationLog.status,
  );

  // 7. Try retrieving a non-existent escalation log (should fail)
  const randomEscalationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent escalation log returns error",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.at(
        connection,
        { escalationLogId: randomEscalationId },
      );
    },
  );

  // 8. Switch to member session and attempt retrieving escalation log (should fail with insufficient privilege)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "strongpass123",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member cannot retrieve admin escalation log details",
    async () => {
      await api.functional.communityPlatform.admin.escalationLogs.at(
        connection,
        { escalationLogId: escalationLog.id },
      );
    },
  );
}
