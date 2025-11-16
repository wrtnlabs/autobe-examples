import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_user_report_assignment_and_case_link_update(
  connection: api.IConnection,
) {
  // 1. Create a memberUser (reporter + reported)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // 2. Create adminUser A (will perform the update)
  const adminAEmail = `${RandomGenerator.alphabets(8)}+adminA@example.com`;
  const adminAPassword = RandomGenerator.alphaNumeric(12);

  const adminAJoinBody = {
    username: RandomGenerator.name(1),
    email: adminAEmail,
    password: adminAPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuthorized);

  const adminAId = adminAAuthorized.id;

  // 3. Create adminUser B (will be assigned to the report)
  const adminBEmail = `${RandomGenerator.alphabets(8)}+adminB@example.com`;
  const adminBPassword = RandomGenerator.alphaNumeric(12);

  const adminBJoinBody = {
    username: RandomGenerator.name(1),
    email: adminBEmail,
    password: adminBPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  const adminBId = adminBAuthorized.id;

  // 4. Ensure we are authenticated as memberUser again before creating report
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 5. Create an initial user report as the memberUser actor
  const createReportBody = {
    reported_memberuser_id: memberId,
    reason_category: "spam",
    reason_detail: "suspicious spam-like behavior detected in multiple posts",
    status: "open",
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const originalReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(originalReport);

  // 6. Authenticate as adminUser A who will perform the update
  const adminALoginBody = {
    identifier: adminAEmail,
    password: adminAPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminALoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALoginResult);

  // 7. Prepare update payload: assign to admin B and link to a synthetic moderation case
  const syntheticModerationCaseId = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBody = {
    assigned_adminuser_id: adminBId,
    moderation_case_id: syntheticModerationCaseId,
    reason_detail:
      "linked into case for cluster of related spam accounts from automated triage queue",
    status: "in_review",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.IUpdate;

  const updatedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.update(
      connection,
      {
        userReportId: originalReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // 8. Validate core invariants
  TestValidator.equals(
    "report id should remain unchanged after update",
    updatedReport.id,
    originalReport.id,
  );

  TestValidator.equals(
    "reported member user id should be preserved",
    updatedReport.reported_memberuser_id,
    originalReport.reported_memberuser_id,
  );

  TestValidator.equals(
    "reporter member user id should be preserved",
    updatedReport.reporter_memberuser_id ?? null,
    originalReport.reporter_memberuser_id ?? null,
  );

  TestValidator.equals(
    "assigned admin user id should be set to admin B",
    updatedReport.assigned_adminuser_id ?? null,
    adminBId,
  );

  TestValidator.equals(
    "moderation_case_id should be updated to synthetic value",
    updatedReport.moderation_case_id ?? null,
    syntheticModerationCaseId,
  );

  TestValidator.equals(
    "reason_detail should reflect updated explanatory text",
    updatedReport.reason_detail ?? null,
    updateBody.reason_detail,
  );

  // 9. Validate assigned_admin summary when present
  if (
    updatedReport.assigned_admin !== null &&
    updatedReport.assigned_admin !== undefined
  ) {
    TestValidator.equals(
      "assigned_admin summary id should match admin B id",
      updatedReport.assigned_admin.id,
      adminBId,
    );
  }

  // 10. Validate timestamps: created_at unchanged, updated_at advanced
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedReport.created_at,
    originalReport.created_at,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updatedReport.updated_at,
    originalReport.updated_at,
  );

  // Ensure updated_at is not earlier than created_at (lexicographical compare on ISO strings)
  const timestampsOrderIsValid =
    updatedReport.updated_at >= updatedReport.created_at;
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    timestampsOrderIsValid,
  );
}
