import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

/**
 * Validate that a user report detail reflects linkage to a moderation case.
 *
 * Business goal: Ensure that when an admin links a user report to a moderation
 * case via the update endpoint, the admin detail read endpoint returns a
 * non-null moderation_case relation whose id corresponds to the linked
 * moderation case, and that core report relations such as reported_member and
 * reporter_admin remain intact.
 *
 * End-to-end steps:
 *
 * 1. Create an adminUser via /auth/adminUser/join. The SDK attaches the admin JWT
 *    to the connection headers, enabling subsequent admin calls.
 * 2. Create a memberUser via /auth/memberUser/join who will be the reported
 *    subject.
 * 3. As the same admin, create a moderation case via
 *    /communityPlatform/adminUser/moderationCases with a known case_key, title,
 *    status, and priority.
 * 4. As the admin, create a user report via
 *    /communityPlatform/adminUser/userReports targeting the member user, with
 *    specific reason_category, reason_detail, status, and severity.
 * 5. Link the report to the moderation case using
 *    /communityPlatform/adminUser/userReports/{userReportId} PUT, providing
 *    moderation_case_id in the IUpdate payload.
 * 6. Retrieve the report detail via
 *    /communityPlatform/adminUser/userReports/{userReportId} GET.
 * 7. Assert that:
 *
 *    - The response matches ICommunityPlatformUserReport (typia.assert).
 *    - Moderation_case_id equals the moderation case id.
 *    - Moderation_case summary is non-null and its id matches the moderation case
 *         id.
 *    - Reported_member is non-null and its id equals the member’s id.
 *    - Reporter_admin is non-null and its id equals the admin’s id.
 *    - Linking the moderation case did not clear or corrupt core report relations
 *         (reported_member and reporter_admin).
 */
export async function test_api_user_report_detail_reflects_moderation_case_linkage(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain authorized admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Join a memberUser (reported subject)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!", // satisfies MinLength<8>
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. Create a moderation case under the admin context
  const moderationCaseBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 4. Create a user report targeting the member user
  const userReportCreateBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      {
        body: userReportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  // Basic invariants on created report
  TestValidator.equals(
    "created report reported_memberuser_id matches member id",
    createdReport.reported_memberuser_id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created report status is open",
    createdReport.status,
    userReportCreateBody.status,
  );
  TestValidator.equals(
    "created report severity is high",
    createdReport.severity,
    userReportCreateBody.severity,
  );

  // 5. Link the report to the moderation case via update
  const linkUpdateBody = {
    moderation_case_id: moderationCase.id,
  } satisfies ICommunityPlatformUserReport.IUpdate;

  const linkedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.update(
      connection,
      {
        userReportId: createdReport.id,
        body: linkUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(linkedReport);

  // Verify that moderation_case_id is now set
  TestValidator.equals(
    "linked report moderation_case_id equals moderation case id",
    linkedReport.moderation_case_id ?? null,
    moderationCase.id,
  );

  // Ensure core identity fields are unchanged between created and linked
  TestValidator.equals(
    "report id is stable after linking",
    linkedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "reported_memberuser_id remains the same after linking",
    linkedReport.reported_memberuser_id,
    createdReport.reported_memberuser_id,
  );

  // 6. Fetch the report detail via GET
  const detailedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.at(
      connection,
      {
        userReportId: linkedReport.id,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(detailedReport);

  // 7. Business assertions on detailed report
  TestValidator.equals(
    "detailed report id matches linked report id",
    detailedReport.id,
    linkedReport.id,
  );

  // moderation_case_id consistency
  TestValidator.equals(
    "detailed report moderation_case_id matches moderation case id",
    detailedReport.moderation_case_id ?? null,
    moderationCase.id,
  );

  // moderation_case summary must be present and reference the same case id
  TestValidator.predicate(
    "detailed report has non-null moderation_case relation when linked",
    detailedReport.moderation_case !== null &&
      detailedReport.moderation_case !== undefined,
  );
  if (
    detailedReport.moderation_case !== null &&
    detailedReport.moderation_case !== undefined
  ) {
    // ICommunityPlatformModerationCase.ISummary has at least an id field
    TestValidator.equals(
      "moderation_case summary id matches moderation case id",
      detailedReport.moderation_case.id,
      moderationCase.id,
    );
  }

  // reported_member relation should be non-null and match member id
  TestValidator.predicate(
    "detailed report has reported_member summary",
    detailedReport.reported_member !== undefined &&
      detailedReport.reported_member !== null,
  );
  if (
    detailedReport.reported_member !== undefined &&
    detailedReport.reported_member !== null
  ) {
    TestValidator.equals(
      "reported_member summary id matches member id",
      detailedReport.reported_member.id,
      memberAuthorized.id,
    );
  }

  // reporter_admin should be present because admin created the report
  TestValidator.predicate(
    "detailed report has reporter_admin summary",
    detailedReport.reporter_admin !== undefined &&
      detailedReport.reporter_admin !== null,
  );
  if (
    detailedReport.reporter_admin !== undefined &&
    detailedReport.reporter_admin !== null
  ) {
    TestValidator.equals(
      "reporter_admin summary id matches admin id",
      detailedReport.reporter_admin.id,
      adminAuthorized.id,
    );
  }

  // Ensure linking has not removed reporter_member or reporter_admin
  TestValidator.predicate(
    "linking moderation case does not clear reporter and reported relations",
    detailedReport.reported_member !== null &&
      detailedReport.reported_member !== undefined &&
      detailedReport.reporter_admin !== null &&
      detailedReport.reporter_admin !== undefined,
  );

  // Finally, verify that moderation_case linkage changed between created and detailed report
  TestValidator.notEquals(
    "moderation_case_id differs between created and detailed report",
    createdReport.moderation_case_id ?? null,
    detailedReport.moderation_case_id ?? null,
  );
}
