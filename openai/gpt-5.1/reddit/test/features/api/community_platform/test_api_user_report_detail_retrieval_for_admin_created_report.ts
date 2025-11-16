import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_user_report_detail_retrieval_for_admin_created_report(
  connection: api.IConnection,
) {
  // 1. Register a member user who will be the reported subject.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Establish admin context by joining an admin user.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 3. Create a user report as the authenticated admin against the member.
  const reasonCategory = "abuse/test-category";
  const status = "open";
  const severity = "medium";

  const createBody = {
    reported_memberuser_id: memberAuthorized.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    status,
    severity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  // 4. Retrieve the same report via the detail endpoint.
  const detailedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.at(
      connection,
      {
        userReportId: createdReport.id,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(detailedReport);

  // 5. Validate identity and core fields between create and detail responses.
  TestValidator.equals(
    "report id should match between create and detail",
    detailedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "reported_memberuser_id should match member user id",
    detailedReport.reported_memberuser_id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "reason_category should be preserved",
    detailedReport.reason_category,
    reasonCategory,
  );

  TestValidator.equals(
    "status should be preserved",
    detailedReport.status,
    status,
  );

  TestValidator.equals(
    "severity should be preserved",
    detailedReport.severity,
    severity,
  );

  // created_at / updated_at coherence between create and detail.
  TestValidator.equals(
    "created_at timestamp should match between create and detail",
    detailedReport.created_at,
    createdReport.created_at,
  );

  TestValidator.equals(
    "updated_at timestamp should match between create and detail",
    detailedReport.updated_at,
    createdReport.updated_at,
  );

  // 6. Validate reporter fields for an admin-authored report.
  TestValidator.predicate(
    "reporter_adminuser_id should be defined for admin-authored report",
    detailedReport.reporter_adminuser_id !== null &&
      detailedReport.reporter_adminuser_id !== undefined,
  );

  if (
    detailedReport.reporter_adminuser_id !== null &&
    detailedReport.reporter_adminuser_id !== undefined
  ) {
    TestValidator.equals(
      "reporter_adminuser_id should match admin id",
      detailedReport.reporter_adminuser_id,
      adminAuthorized.id,
    );
  }

  TestValidator.predicate(
    "reporter_memberuser_id should be null or undefined for admin-authored report",
    detailedReport.reporter_memberuser_id === null ||
      detailedReport.reporter_memberuser_id === undefined,
  );

  // reporter_admin summary should exist and match reporter_adminuser_id.
  TestValidator.predicate(
    "reporter_admin summary should be present",
    detailedReport.reporter_admin !== null &&
      detailedReport.reporter_admin !== undefined,
  );

  if (
    detailedReport.reporter_admin !== null &&
    detailedReport.reporter_admin !== undefined &&
    detailedReport.reporter_adminuser_id !== null &&
    detailedReport.reporter_adminuser_id !== undefined
  ) {
    TestValidator.equals(
      "reporter_admin summary id should match reporter_adminuser_id",
      detailedReport.reporter_admin.id,
      detailedReport.reporter_adminuser_id,
    );
  }

  TestValidator.predicate(
    "reporter_member summary should be null when reporter is admin",
    detailedReport.reporter_member === null ||
      detailedReport.reporter_member === undefined,
  );

  // 7. Validate default/null relationship fields for a fresh report.
  TestValidator.predicate(
    "assigned_adminuser_id should be null or undefined by default",
    detailedReport.assigned_adminuser_id === null ||
      detailedReport.assigned_adminuser_id === undefined,
  );

  TestValidator.predicate(
    "assigned_admin relation should be null or undefined by default",
    detailedReport.assigned_admin === null ||
      detailedReport.assigned_admin === undefined,
  );

  TestValidator.predicate(
    "moderation_case_id should be null or undefined by default",
    detailedReport.moderation_case_id === null ||
      detailedReport.moderation_case_id === undefined,
  );

  TestValidator.predicate(
    "moderation_case relation should be null or undefined by default",
    detailedReport.moderation_case === null ||
      detailedReport.moderation_case === undefined,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined for an active report",
    detailedReport.deleted_at === null ||
      detailedReport.deleted_at === undefined,
  );
}
