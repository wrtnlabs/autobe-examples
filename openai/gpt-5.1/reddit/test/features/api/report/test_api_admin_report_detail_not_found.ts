import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that platform admin report detail endpoint returns an error for
 * non-existent reportId.
 *
 * Business context: Platform admins can retrieve detailed moderation reports
 * via GET /communityPlatform/platformAdmin/reports/{reportId}. When a report
 * UUID does not exist, the endpoint must not fabricate a record and should
 * respond with a not-found style error. This test ensures that behavior in a
 * realistic multi-actor context where real reports and categories exist.
 *
 * Steps:
 *
 * 1. Register a platform admin actor using POST /auth/platformAdmin/join, so that
 *    subsequent platformAdmin endpoints are authenticated via SDK.
 * 2. Register a member user actor using POST /auth/memberUser/join, so that
 *    memberUser-scoped operations (like creating reports) can be exercised.
 * 3. As platformAdmin, create at least one report reason category via POST
 *    /communityPlatform/platformAdmin/reportReasonCategories to satisfy foreign
 *    key requirements on report creation.
 * 4. Switch to memberUser (via /auth/memberUser/login if needed) and create a
 *    valid report via POST /communityPlatform/memberUser/reports using the
 *    existing reason category id. This guarantees that the
 *    community_platform_reports table is non-empty and that there exists at
 *    least one valid report.id.
 * 5. Generate a fresh random UUID to serve as a non-existent reportId and ensure
 *    it does not equal the created report.id. We do not need to exhaustively
 *    prove non-existence; using a distinct random uuid relative to known ids is
 *    sufficient in test context.
 * 6. Switch back to platformAdmin (via /auth/platformAdmin/login if needed) and
 *    call GET /communityPlatform/platformAdmin/reports/{reportId} with the
 *    non-existent UUID.
 * 7. Assert that this call fails using TestValidator.error with an async closure,
 *    verifying only that an error occurs (no direct status code assertions).
 *    Also, ensure that no ICommunityPlatformReport response object is produced
 *    from the not-found call.
 */
export async function test_api_admin_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As platformAdmin, create a report reason category
  const reasonCategoryBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryBody,
      },
    );
  typia.assert(reasonCategory);

  // 4. As memberUser, create a valid report
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 5. Generate a distinct non-existent reportId
  const nonExistentReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Extremely unlikely, but ensure we use a different id than the one we just created
  const effectiveNonExistentId: string & tags.Format<"uuid"> =
    nonExistentReportId === createdReport.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistentReportId;

  // 6. Switch back to platformAdmin via login to ensure admin auth context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 7. Call admin detail endpoint with non-existent id and assert error
  await TestValidator.error(
    "admin report detail should error for non-existent id",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.at(
        connection,
        {
          reportId: effectiveNonExistentId,
        },
      );
    },
  );
}
