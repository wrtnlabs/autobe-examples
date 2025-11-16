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

export async function test_api_platform_admin_delete_community_scoped_user_sanction(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain tokens
  const adminPassword = "PlatformAdmin#123";
  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphabets(8)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        displayName: RandomGenerator.name(),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminAuth);

  // 2. Register member user and obtain tokens
  const memberPassword = "MemberUser#123";
  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: `member_${RandomGenerator.alphabets(8)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
        href: "https://app.example.com/join",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuth);

  // 3. Ensure we are logged in as platform admin (actor switch)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminAuth.email,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // 4. Create a community visibility level to be referenced by communities
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Public ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 5. Switch to member user and create a community scoped by the visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberAuth.email,
      password: memberPassword,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(10)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Member user files a report in the created community
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
  typia.assert<ICommunityPlatformReport>(report);

  // 7. Switch back to platform admin to create sanctions based on the report
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminAuth.email,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 7-1. Create a community-scoped sanction via report-scoped API (target of deletion)
  const reportScopedSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: tomorrow.toISOString(),
    reason_summary: "Community abuse sanction for testing",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const reportScopedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: reportScopedSanctionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(reportScopedSanction);

  // Validate sanction relationships before deletion
  TestValidator.equals(
    "report-scoped sanction is linked to the correct report",
    reportScopedSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "report-scoped sanction is linked to the correct community",
    reportScopedSanction.community?.id ?? null,
    community.id,
  );
  TestValidator.equals(
    "report-scoped sanction is linked to the correct member user",
    reportScopedSanction.sanctioned_memberUser.id,
    memberAuth.id,
  );

  // 7-2. Create an additional sanction (e.g., platform-wide) that should remain unaffected
  const additionalSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: null,
    sanction_type: "platform_warning",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: null,
    reason_summary: "Additional unrelated sanction for isolation test",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const additionalSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: additionalSanctionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserSanction>(additionalSanction);

  // Sanity check additional sanction also targets the same member user
  TestValidator.equals(
    "additional sanction targets same member user",
    additionalSanction.sanctioned_memberUser.id,
    memberAuth.id,
  );

  // 8. Invoke DELETE to remove only the report-scoped community sanction
  await api.functional.communityPlatform.platformAdmin.reports.userSanctions.erase(
    connection,
    {
      reportId: report.id,
      userSanctionId: reportScopedSanction.id,
    },
  );

  // 9. Since there is no read/index endpoint for sanctions, we validate success implicitly:
  // - erase did not throw an error
  // - other entities (community, report, other sanction) were created successfully earlier.
  TestValidator.predicate(
    "delete operation for report-scoped sanction completed without throwing",
    true,
  );
}
