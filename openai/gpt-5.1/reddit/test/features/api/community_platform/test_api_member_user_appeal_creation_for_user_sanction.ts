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
 * Validate that a member user can submit an appeal targeting a user sanction on
 * their own account.
 *
 * Business flow validated by this test:
 *
 * 1. A member user self-registers and becomes the potential subject of sanctions.
 * 2. The member user submits a moderation report, which becomes the motivating
 *    report.
 * 3. A platform administrator joins and creates a platform-wide user sanction
 *    against that member, linked to the report.
 * 4. The sanctioned member user submits an appeal with scope "sanction" explaining
 *    why the sanction should be reconsidered.
 * 5. The system returns an appeal object properly linked to the original report,
 *    the user sanction, and the appellant member user, with correct initial
 *    workflow fields populated.
 * 6. Additionally, an unauthenticated connection is verified to be unable to
 *    create an appeal.
 */
export async function test_api_member_user_appeal_creation_for_user_sanction(
  connection: api.IConnection,
) {
  // 1. Register the member user who will later be sanctioned and will submit the appeal.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Capture member id for later linkage checks.
  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. As this member user, create a report that will motivate the sanction.
  // We do not have a discovery endpoint for reason categories, so we rely on random
  // generation that satisfies the UUID shape for report_reason_category_id.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  const reportId: string & tags.Format<"uuid"> = report.id;

  // 3. Register a platform administrator to be able to create user sanctions.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const adminReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As platformAdmin, create a platform-wide user sanction against the member user.
  const now = new Date();
  const effectiveFrom: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const effectiveUntilDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const effectiveUntil: string & tags.Format<"date-time"> =
    effectiveUntilDate.toISOString() as string & tags.Format<"date-time">;

  const sanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: memberId,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  const sanctionId: string & tags.Format<"uuid"> = sanction.id;

  // Basic sanity checks on created sanction.
  TestValidator.equals(
    "sanction report linkage matches motivating report",
    sanction.report.id,
    reportId,
  );
  TestValidator.equals(
    "sanction subject matches member user",
    sanction.sanctioned_memberUser.id,
    memberId,
  );

  // 5. Ensure we are authenticated as the member user when submitting the appeal.
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const reauthorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reauthorizedMember);
  TestValidator.equals(
    "reauthorized member id should equal original member id",
    reauthorizedMember.id,
    memberId,
  );

  // 6. As this member user, submit an appeal with scope "sanction".
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 7. Validate appeal core fields and associations.
  TestValidator.equals(
    "appeal scope should match requested scope",
    appeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );

  TestValidator.predicate(
    "appeal_status should be a non-empty string",
    appeal.appeal_status.length > 0,
  );

  TestValidator.equals(
    "appeal report id should match motivating report id",
    appeal.report.id,
    reportId,
  );

  if (appeal.userSanction !== undefined) {
    TestValidator.equals(
      "appeal userSanction id should match created sanction id",
      appeal.userSanction.id,
      sanctionId,
    );
    TestValidator.equals(
      "appeal userSanction reportId should match motivating report id",
      appeal.userSanction.reportId,
      reportId,
    );
    TestValidator.equals(
      "appeal userSanction subject id should match sanctioned member user id",
      appeal.userSanction.subject.id,
      memberId,
    );
  }

  if (appeal.appellantMemberUser !== undefined) {
    TestValidator.equals(
      "appeal appellantMemberUser id should match member user id",
      appeal.appellantMemberUser.id,
      memberId,
    );
  }

  TestValidator.predicate(
    "appeal created_at should be a non-empty timestamp",
    appeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "appeal updated_at should be a non-empty timestamp",
    appeal.updated_at.length > 0,
  );

  TestValidator.predicate(
    "appeal resolved_at should be null or undefined initially",
    appeal.resolved_at === undefined || appeal.resolved_at === null,
  );

  // 8. Negative test: unauthenticated client must not be able to create an appeal.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated appeal creation should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        unauthenticatedConnection,
        {
          body: appealCreateBody,
        },
      );
    },
  );
}
