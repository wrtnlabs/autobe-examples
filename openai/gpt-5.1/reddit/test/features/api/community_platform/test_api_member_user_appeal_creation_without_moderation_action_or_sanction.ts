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
 * Verify that a member user can create an appeal that is associated only with a
 * report and not with any moderation action or user sanction yet.
 *
 * Business workflow validated by this test:
 *
 * 1. A new member user joins the platform via POST /auth/memberUser/join,
 *    establishing an authenticated member context.
 * 2. Acting as this member, the client creates a report via POST
 *    /communityPlatform/memberUser/reports with a valid reporter_type and
 *    report_reason_category_id plus simple optional metadata.
 * 3. Without creating any moderation action or user sanction, the member submits
 *    an appeal via POST /communityPlatform/memberUser/appeals using
 *    ICommunityPlatformAppeal.ICreate, providing an appeal_scope (e.g.
 *    "content"), a short reason_summary, and detailed free-text explanation in
 *    details.
 * 4. The test asserts that the appeal is successfully created, is linked to the
 *    previously created report, and that moderationAction and userSanction
 *    associations are absent/undefined while appeal_status and timestamps are
 *    properly initialized.
 *
 * This ensures that the API supports appeal workflows that are initiated
 * directly from a report, before any explicit moderation action or user
 * sanction exists, and that such partial associations are represented
 * consistently in the returned DTO.
 */
export async function test_api_member_user_appeal_creation_without_moderation_action_or_sanction(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated context.
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  // 2. As this member, create a report using the memberUser reports endpoint.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Submit an appeal without any moderation action or user sanction created.
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(appeal);

  // 4. Business validations.
  // 4-1. Appeal must be associated with the report created in step 2.
  TestValidator.equals(
    "appeal is associated with the created report",
    appeal.report.id,
    report.id,
  );

  // 4-2. moderationAction and userSanction should not be set on initial creation.
  TestValidator.predicate(
    "moderationAction should be absent on newly created appeal",
    appeal.moderationAction === undefined,
  );

  TestValidator.predicate(
    "userSanction should be absent on newly created appeal",
    appeal.userSanction === undefined,
  );

  // 4-3. appeal_status should be a non-empty string.
  TestValidator.predicate(
    "appeal_status should be initialized and non-empty",
    typeof appeal.appeal_status === "string" && appeal.appeal_status.length > 0,
  );

  // 4-4. created_at and updated_at timestamps should be present and non-empty.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof appeal.created_at === "string" && appeal.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof appeal.updated_at === "string" && appeal.updated_at.length > 0,
  );
}
