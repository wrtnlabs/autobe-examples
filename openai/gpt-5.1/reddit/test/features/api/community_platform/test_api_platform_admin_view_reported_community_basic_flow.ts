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

/**
 * Validate that a platform administrator can retrieve the detailed community
 * associated with a community-targeted report.
 *
 * Business flow:
 *
 * - A platform admin exists and can manage visibility levels.
 * - A member user can join, create a community using a configured visibility
 *   level, and submit a report that targets that community.
 * - The platform admin can then fetch the reported community details from the
 *   report id using the admin-only endpoint.
 *
 * Steps:
 *
 * 1. Register a platform admin (join) which also authenticates the admin.
 * 2. As the platform admin, create a community visibility level with a unique code
 *    so that communities can reference it.
 * 3. Register a member user using the memberUser join endpoint.
 * 4. Switch authentication to the member user by logging in (to ensure clear actor
 *    context), then create a community that references the created visibility
 *    level code.
 * 5. As the member user, create a moderation report with reporter_type "member"
 *    that targets the created community by setting community_id and a random
 *    report_reason_category_id.
 * 6. Switch authentication back to the platform admin via the admin login
 *    endpoint, using the same credentials as in step 1.
 * 7. Call the admin-only endpoint
 *    api.functional.communityPlatform.platformAdmin.reports.community.at with
 *    the created report id.
 * 8. Validate that:
 *
 *    - Typia.assert passes for the response
 *    - The returned community.id matches the created community id
 *    - The community.identifier and title match those used at creation
 *    - The embedded visibilityLevel.code matches the created visibility level code
 *    - The community is not archived or removed (is_archived === false and
 *         is_removed === false)
 *
 * Error flows like 404/403 or invalid-type requests are intentionally skipped
 * to keep the test fully type-safe and focused on the successful happy path.
 */
export async function test_api_platform_admin_view_reported_community_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platform admin (auto-authenticated)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminJoinResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 2. As platform admin, create a community visibility level
  const visibilityCode: string = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match creation code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (join -> auto-auth as memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberJoinResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinResult);

  // 4. Explicitly switch to member user by logging in again
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/join-complete",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 5. As member user, create a community referencing the visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphabets(8)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "created community identifier must match request",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "created community title must match request",
    community.title,
    communityTitle,
  );
  TestValidator.equals(
    "created community visibilityLevel.code must match visibilityCode",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. As member user, create a report targeting the created community
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(report);

  // 7. Switch back to platform admin by logging in
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 8. As platform admin, fetch the reported community by report id
  const linkage: ICommunityPlatformReportOfCommunities =
    await api.functional.communityPlatform.platformAdmin.reports.community.at(
      connection,
      { reportId: report.id },
    );
  typia.assert(linkage);

  const reportedCommunity: ICommunityPlatformCommunity = linkage.community;
  typia.assert(reportedCommunity);

  // Core validations on the reported community
  TestValidator.equals(
    "reported community id must match original community id",
    reportedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "reported community identifier must match original",
    reportedCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "reported community title must match original",
    reportedCommunity.title,
    communityTitle,
  );
  TestValidator.equals(
    "reported community visibilityLevel.code must match created visibility code",
    reportedCommunity.visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "reported community must not be archived",
    reportedCommunity.is_archived,
    false,
  );
  TestValidator.equals(
    "reported community must not be removed",
    reportedCommunity.is_removed,
    false,
  );
}
