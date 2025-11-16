import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can create a community-scoped user
 * sanction for a specific report.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin self-registers and becomes authenticated.
 * 2. Member user self-registers and becomes authenticated.
 * 3. Platform admin creates a visibility level master record.
 * 4. Member user creates a community referencing that visibility level.
 * 5. Member user files a report scoped to that community.
 * 6. Platform admin optionally creates a standalone user sanction to verify base
 *    behavior.
 * 7. Platform admin creates a report-scoped, community-scoped user sanction for
 *    the member user.
 * 8. The test asserts that the created sanction references the correct report,
 *    member user, and community, and that key business fields (sanction_type,
 *    status, effective window, and reasons) match the request.
 */
export async function test_api_platform_admin_creates_community_scoped_user_sanction(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Member user joins (auto-authenticated as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch to platformAdmin explicitly via login (even though join already authenticated)
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 4. Platform admin creates a visibility level master record
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 5. Switch to memberUser via login
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 6. Member user creates a community referencing the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Sanction Test Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 7. Member user creates a report in the context of the created community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. Switch back to platformAdmin via login to create sanctions
  const platformAdminRelogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 9. Optionally create a standalone user sanction (not report-scoped) to ensure base behavior
  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const standaloneSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "warning",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: inOneDay.toISOString(),
    reason_summary: "Standalone warning before community scoped ban",
    notes_internal: "Initial standalone sanction for baseline coverage",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const standaloneSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: standaloneSanctionCreateBody,
      },
    );
  typia.assert(standaloneSanction);

  // 10. Create the main report-scoped, community-scoped user sanction
  const sanctionEffectiveFrom = new Date();
  const sanctionEffectiveUntil = new Date(
    sanctionEffectiveFrom.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const reportScopedSanctionBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: sanctionEffectiveFrom.toISOString(),
    effective_until: sanctionEffectiveUntil.toISOString(),
    reason_summary: "Violation of community guidelines – temporary ban",
    notes_internal:
      "Community-scoped ban created via report-scoped endpoint for E2E test.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: reportScopedSanctionBody,
      },
    );
  typia.assert(sanction);

  // 11. Business assertions on the created sanction
  TestValidator.equals(
    "sanction report summary id should match original report id",
    sanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member user summary id should match target member id",
    sanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  if (sanction.community !== null && sanction.community !== undefined) {
    TestValidator.equals(
      "sanction community summary id should match created community id",
      sanction.community.id,
      community.id,
    );
  } else {
    throw new Error(
      "Expected community-scoped sanction to include community summary but found null/undefined.",
    );
  }

  TestValidator.equals(
    "sanction type should match request body",
    sanction.sanction_type,
    reportScopedSanctionBody.sanction_type,
  );

  TestValidator.equals(
    "sanction status should match request body",
    sanction.status,
    reportScopedSanctionBody.status,
  );

  TestValidator.equals(
    "sanction effective_from should match request body",
    sanction.effective_from,
    reportScopedSanctionBody.effective_from,
  );

  TestValidator.equals(
    "sanction effective_until should match request body",
    sanction.effective_until,
    reportScopedSanctionBody.effective_until,
  );

  TestValidator.equals(
    "sanction reason_summary should match request body",
    sanction.reason_summary,
    reportScopedSanctionBody.reason_summary,
  );

  TestValidator.equals(
    "sanction notes_internal should match request body",
    sanction.notes_internal,
    reportScopedSanctionBody.notes_internal,
  );

  // Ensure the effective window is coherent
  TestValidator.predicate(
    "effective_from must be before effective_until for temporary ban",
    new Date(sanction.effective_from).getTime() <
      new Date(
        typia.assert<string & tags.Format<"date-time">>(
          sanction.effective_until!,
        ),
      ).getTime(),
  );
}
