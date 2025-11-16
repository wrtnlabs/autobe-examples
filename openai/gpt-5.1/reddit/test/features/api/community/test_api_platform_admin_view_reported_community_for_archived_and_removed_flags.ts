import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfCommunities } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfCommunities";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_platform_admin_view_reported_community_for_archived_and_removed_flags(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorization
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "P@ssw0rd-Admin";

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedJoin);

  // 2. As platformAdmin, create a community visibility level
  const visibilityCode = `code-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.alphabets(5)}`,
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

  // 3. Register a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "P@ssw0rd-Member";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  // 4. As memberUser, create a community using the new visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Snapshot original archival/removal flags for later comparison
  const originalIsArchived: boolean = createdCommunity.is_archived;
  const originalIsRemoved: boolean = createdCommunity.is_removed;

  // 5. As memberUser, create a report targeting this community
  const reportCreateBody = {
    reporter_type: "member",
    // We cannot look up real categories, but typia.random will construct a
    // structurally valid UUID per schema expectations.
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: createdCommunity.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 6. Switch back to platformAdmin context by logging in
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  // 7. As platformAdmin, retrieve the reported community for this report
  const reportOfCommunity: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.platformAdmin.reports.community.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reportOfCommunity);

  // 8. Validate community linkage and archival/removal flags
  const reportedCommunity: ICommunityPlatformCommunity =
    reportOfCommunity.community;

  TestValidator.equals(
    "reported community id should match created community id",
    reportedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "is_archived flag must reflect the persisted community state",
    reportedCommunity.is_archived,
    originalIsArchived,
  );

  TestValidator.equals(
    "is_removed flag must reflect the persisted community state",
    reportedCommunity.is_removed,
    originalIsRemoved,
  );
}
