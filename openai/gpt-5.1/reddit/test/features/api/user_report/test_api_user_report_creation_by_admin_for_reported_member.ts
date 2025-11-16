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

export async function test_api_user_report_creation_by_admin_for_reported_member(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated adminUser context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Prepare a UUID-shaped reported member user id (assuming member exists in broader system).
  const reportedMemberId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a user report via the admin-only endpoint.
  const createBody = {
    reported_memberuser_id: reportedMemberId,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const report: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      { body: createBody },
    );
  typia.assert<ICommunityPlatformUserReport>(report);

  // 4. Business validations on the created report.
  // 4-1. Core field echoes.
  TestValidator.equals(
    "reported_memberuser_id should match the input UUID",
    report.reported_memberuser_id,
    reportedMemberId,
  );

  TestValidator.equals(
    "status should be the requested initial status",
    report.status,
    createBody.status,
  );

  TestValidator.equals(
    "severity should be the requested initial severity",
    report.severity,
    createBody.severity,
  );

  // 4-2. deleted_at must be null for a fresh report.
  TestValidator.equals(
    "deleted_at should be null for a newly created report",
    report.deleted_at ?? null,
    null,
  );

  // 4-3. created_at and updated_at must be non-empty ISO date-time strings.
  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    () => report.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    () => report.updated_at.length > 0,
  );

  // 4-4. Reporter identity should be an admin, not a member.
  TestValidator.predicate(
    "reporter_memberuser_id should be null when report is created by adminUser",
    () =>
      report.reporter_memberuser_id === null ||
      report.reporter_memberuser_id === undefined,
  );

  TestValidator.predicate(
    "reporter_adminuser_id should be non-null when created by adminUser actor",
    () => !!report.reporter_adminuser_id,
  );

  if (report.reporter_adminuser_id != null) {
    TestValidator.equals(
      "reporter_adminuser_id should match authenticated admin id when populated",
      report.reporter_adminuser_id,
      adminAuthorized.id,
    );
  }

  // 4-5. Reporter admin summary should be populated and consistent when present.
  if (report.reporter_admin != null) {
    typia.assert<ICommunityPlatformAdminuser.ISummary>(report.reporter_admin);

    TestValidator.equals(
      "reporter_admin summary id should match reporter_adminuser_id",
      report.reporter_admin.id,
      report.reporter_adminuser_id!,
    );

    TestValidator.predicate(
      "reporter_admin summary displayName should be non-empty",
      () => report.reporter_admin!.displayName.length > 0,
    );
  }
}
