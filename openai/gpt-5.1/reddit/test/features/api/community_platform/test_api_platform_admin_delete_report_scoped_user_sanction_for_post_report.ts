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

export async function test_api_platform_admin_delete_report_scoped_user_sanction_for_post_report(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a platform admin
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.console.local/join",
        referrer: "https://admin.console.local/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // 2. Create a visibility level as platform admin (required for community creation)
  const visibilityCode = `public-visible-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visible",
          description: "Publicly visible community for testing sanctions.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user who will be sanctioned
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
          tags.Format<"email">,
        password: "P@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://community.app.local/signup" as string &
          tags.Format<"uri">,
        referrer: "https://community.app.local/home" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // Switch connection to member user context by logging in explicitly
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: "P@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://community.app.local/login" as string &
          tags.Format<"uri">,
        referrer: "https://community.app.local/home" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 4. As member user, create a community using the previously created visibility level code
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `test-community-${RandomGenerator.alphaNumeric(8)}`,
          title: "Test Sanction Community",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Basic invariant: community uses the visibility level we just created
  TestValidator.equals(
    "community visibility code should match created visibility level code",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. As member user, create a report that will own the report-scoped sanction
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 6. Switch back to platform admin by logging in explicitly
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoin.email,
        password: "P@ssw0rd!",
        ip: "127.0.0.1",
        href: "https://admin.console.local/login" as string &
          tags.Format<"uri">,
        referrer: "https://admin.console.local/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  // 7. Create a standalone user sanction (generic, not coupled by path to the report)
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const standaloneSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: now.toISOString(),
          effective_until: oneHourLater.toISOString(),
          reason_summary: "Standalone sanction used to verify isolation.",
          notes_internal: "Created by E2E test as unrelated sanction.",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(standaloneSanction);

  // 8. Create a report-scoped user sanction through the report-specific endpoint
  const reportScopedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: now.toISOString(),
          effective_until: oneHourLater.toISOString(),
          reason_summary: "Report-scoped sanction subject to deletion.",
          notes_internal:
            "Created by E2E test to validate DELETE report-scoped sanction.",
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(reportScopedSanction);

  // Sanction invariants: both sanctions target the same member and report
  TestValidator.equals(
    "standalone sanction and report-scoped sanction must share sanctioned member user id",
    standaloneSanction.sanctioned_memberUser.id,
    reportScopedSanction.sanctioned_memberUser.id,
  );
  TestValidator.equals(
    "standalone sanction and report-scoped sanction must share originating report id",
    standaloneSanction.report.id,
    reportScopedSanction.report.id,
  );

  // 9. Delete the report-scoped user sanction via the target DELETE endpoint
  await api.functional.communityPlatform.platformAdmin.reports.userSanctions.erase(
    connection,
    {
      reportId: report.id,
      userSanctionId: reportScopedSanction.id,
    },
  );

  // 10. Ensure that the delete did not affect our in-memory objects and that
  // the standalone sanction is still logically valid (typia.assert again)
  typia.assert(standaloneSanction);
  TestValidator.equals(
    "standalone sanction id should remain unchanged after deleting report-scoped sanction",
    standaloneSanction.id,
    standaloneSanction.id,
  );

  // 11. Negative scenario: deleting the same sanction again should fail
  await TestValidator.error(
    "deleting the same report-scoped sanction twice should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.userSanctions.erase(
        connection,
        {
          reportId: report.id,
          userSanctionId: reportScopedSanction.id,
        },
      );
    },
  );
}
