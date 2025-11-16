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

export async function test_api_user_sanction_delete_community_scoped_sanction_cleanup(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-Admin",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Keep identifiers for later logins
  const platformAdminIdentifier = platformAdminAuthorized.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. Register member user (also authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-Member",
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/member",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberIdentifier = memberAuthorized.email;
  const memberPassword = memberJoinBody.password;

  // 3. As member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
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

  // 4. Switch to platformAdmin via login
  const platformAdminLoginBody = {
    identifier: platformAdminIdentifier,
    password: platformAdminPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminSession: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession);

  // 5. As platformAdmin, create a visibility level
  const visibilityCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 6. Switch to memberUser via login
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://member.app.example.com/login",
    referrer: "https://member.app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberSession: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberSession);

  // 7. As memberUser, create a community using created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
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

  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 8. Switch back to platformAdmin via login
  const platformAdminSession2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession2);

  // 9. As platformAdmin, create a community-scoped user sanction
  const nowIso = new Date().toISOString();
  const futureIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberSession.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: nowIso,
    effective_until: futureIso,
    reason_summary: "Test community-level sanction for E2E flow",
    notes_internal: "Internal note created by E2E test",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionCreateBody,
      },
    );
  typia.assert(sanction);

  TestValidator.equals(
    "sanction should be scoped to the created community",
    sanction.community?.id ?? null,
    community.id,
  );

  TestValidator.equals(
    "sanction should reference the created report",
    sanction.report.id,
    report.id,
  );

  // 10. Delete the sanction by its id
  await api.functional.communityPlatform.platformAdmin.userSanctions.erase(
    connection,
    {
      userSanctionId: sanction.id,
    },
  );

  // 11. Negative check: deleting the same sanction twice should cause an error
  await TestValidator.error(
    "second deletion of the same user sanction should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSanctions.erase(
        connection,
        {
          userSanctionId: sanction.id,
        },
      );
    },
  );

  // 12. Switch back to member user and create another report to approximate that
  // the member and community remain intact after sanction deletion.
  const memberSessionAfterDelete: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberSessionAfterDelete);

  const secondReportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const secondReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: secondReportBody,
      },
    );
  typia.assert(secondReport);

  TestValidator.equals(
    "second report should be associated with same community context (if present)",
    secondReport.context_community?.id ?? null,
    secondReportBody.community_id ?? null,
  );
}
