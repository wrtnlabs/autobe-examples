import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Delete an existing user sanction as a platform administrator.
 *
 * Business flow implemented by this test:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join and rely on the
 *    SDK to attach the admin access token to the connection.
 * 2. Register a member user via POST /auth/memberUser/join, again letting the SDK
 *    handle token management.
 * 3. Switch authentication to the member user by explicitly logging in with POST
 *    /auth/memberUser/login so that the subsequent report creation runs under
 *    memberUser actor context.
 * 4. As memberUser, create a moderation report using POST
 *    /communityPlatform/memberUser/reports with a realistic reporter_type and
 *    reason category reference.
 * 5. Switch authentication back to the platform admin by logging in via POST
 *    /auth/platformAdmin/login.
 * 6. As platformAdmin, create a user sanction via POST
 *    /communityPlatform/platformAdmin/userSanctions, referencing the created
 *    report and sanctioned member user, and providing a coherent sanction_type,
 *    status, and effective window.
 * 7. Call DELETE /communityPlatform/platformAdmin/userSanctions/{userSanctionId}
 *    using api.functional.communityPlatform.platformAdmin.userSanctions.erase
 *    to remove the sanction record.
 * 8. Since there is no GET/list API for user sanctions in the provided SDK, the
 *    test cannot re-fetch the sanction after deletion. Instead, it asserts
 *    that:
 *
 *    - The sanction was correctly created (type-checked via typia.assert and basic
 *         field sanity checks).
 *    - The DELETE call completes without throwing.
 *
 * Negative cases around authorization (e.g., memberUser attempting to erase a
 * sanction or unauthenticated deletion) are not covered here because we have no
 * unauthenticated connection primitive (headers must not be touched) and there
 * is no non-admin erase endpoint. Those should be exercised in separate tests
 * when appropriate mechanisms are available.
 */
export async function test_api_user_sanction_delete_remove_sanction_record(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auto-auth via SDK)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Keep admin credentials for later login
  const platformAdminIdentifier: string = platformAdminJoinBody.email;
  const platformAdminPassword: string = platformAdminJoinBody.password;

  // 2. Register a member user (auto-auth via SDK)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const sanctionedMemberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 3. Switch auth to member user via login
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/register-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 4. As member user, create a report
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

  // 5. Switch auth back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminIdentifier,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/join-complete",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 6. As platform admin, create a user sanction against the member
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedMemberId,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Temporary platform ban for policy violation in report.",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // Basic sanity checks on the created sanction prior to deletion
  TestValidator.equals(
    "sanction is linked to the expected report",
    sanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "sanction is linked to the expected member user",
    sanction.sanctioned_memberUser.id,
    sanctionedMemberId,
  );
  TestValidator.equals(
    "sanction type matches request payload",
    sanction.sanction_type,
    sanctionCreateBody.sanction_type,
  );
  TestValidator.equals(
    "sanction status matches request payload",
    sanction.status,
    sanctionCreateBody.status,
  );

  // 7. Delete the sanction as platform admin
  await api.functional.communityPlatform.platformAdmin.userSanctions.erase(
    connection,
    {
      userSanctionId: sanction.id,
    },
  );

  // With no GET/list API to confirm deletion, rely on the fact that the call
  // completed without throwing. This ensures happy-path deletion is wired and
  // authorized for platformAdmin.
}
