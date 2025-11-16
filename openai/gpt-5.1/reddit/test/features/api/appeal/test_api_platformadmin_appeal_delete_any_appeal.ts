import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can delete an appeal created by a
 * member user under a specific moderation report, reflecting global moderation
 * powers.
 *
 * Business flow covered in this test:
 *
 * 1. A member user self-registers and becomes authenticated (Member A).
 * 2. Member A creates a moderation report.
 * 3. Member A creates an appeal for that report.
 * 4. A platform admin self-registers and becomes authenticated.
 * 5. The platform admin deletes the member's appeal using the platformAdmin erase
 *    endpoint.
 * 6. The test verifies that the delete call succeeds and that a second delete
 *    attempt fails, demonstrating that platform admins can remove appeals
 *    globally.
 */
export async function test_api_platformadmin_appeal_delete_any_appeal(
  connection: api.IConnection,
) {
  // 1. Member A joins and becomes authenticated
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member A creates a report
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  const reportId: string & tags.Format<"uuid"> = report.id;

  // 3. Member A creates an appeal for that report
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId,
        body: appealCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appeal);

  const appealId: string & tags.Format<"uuid"> = appeal.id;

  // 4. Platform admin joins and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 5. Platform admin deletes the member's appeal
  await api.functional.communityPlatform.platformAdmin.reports.appeals.erase(
    connection,
    {
      reportId,
      appealId,
    },
  );

  // 6. Second deletion attempt should fail (appeal already removed)
  await TestValidator.error(
    "platform admin cannot delete already deleted appeal",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.appeals.erase(
        connection,
        {
          reportId,
          appealId,
        },
      );
    },
  );
}
