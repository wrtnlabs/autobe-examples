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

export async function test_api_platform_admin_view_reported_community_unauthorized_access_prevention(
  connection: api.IConnection,
) {
  // 1. Prepare initial data: visibility level, memberUser, community, report

  // 1-1) Create a platform admin and a visibility level so member-created communities can reference it
  const platformAdminPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);

  const platformAdminJoinOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoinOutput);

  // We are now authenticated as platformAdmin on `connection` due to SDK behavior.
  const visibilityCode = "public-" + RandomGenerator.alphabets(8);
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 1-2) Register and login a member user
  const memberUsername = "member_" + RandomGenerator.alphabets(8);
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "M3mber-" + RandomGenerator.alphaNumeric(8);

  const memberJoinOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://app.example.com/signup",
        referrer: "https://app.example.com/home",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoinOutput);

  // Ensure memberUser session via explicit login (also validates login endpoint)
  const memberLoginOutput: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://app.example.com/login",
        referrer: "https://app.example.com/home",
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginOutput);

  // 1-3) Create a community as the member user
  const communityIdentifier = "community_" + RandomGenerator.alphabets(10);
  const createCommunityBody = {
    identifier: communityIdentifier,
    title: "Test Community " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(createdCommunity);

  // 1-4) Create a report against that community as the member user
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: createdCommunity.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(createdReport);

  // 2. Anonymous call: create a fresh unauthenticated connection and ensure it fails
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous caller cannot view reported community via platformAdmin endpoint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.community.at(
        anonymousConnection,
        {
          reportId: createdReport.id,
        },
      );
    },
  );

  // 3. Member user call: ensure memberUser cannot access platformAdmin view API
  // At this point, `connection` holds memberUser Authorization token from login above.
  await TestValidator.error(
    "memberUser actor cannot access platformAdmin report community view",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.community.at(
        connection,
        {
          reportId: createdReport.id,
        },
      );
    },
  );

  // 4. Platform admin call: authenticate as platformAdmin and verify success
  const platformAdminLoginOutput: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminJoinOutput.username,
        password: platformAdminPassword,
        ip: RandomGenerator.alphaNumeric(8),
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginOutput);

  const reportOfCommunity: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.platformAdmin.reports.community.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reportOfCommunity);

  // Validate that the reported community in the admin view matches the created community
  TestValidator.equals(
    "reported community id in admin view matches created community id",
    reportOfCommunity.community.id,
    createdCommunity.id,
  );
}
