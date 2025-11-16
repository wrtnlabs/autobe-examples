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
 * sanction for a reported member user.
 *
 * Business flow:
 *
 * 1. Register a platform admin (platformAdmin.join) to gain admin capabilities.
 * 2. Register two member users via memberUser.join: one as the reporter, one as
 *    the sanctioned user.
 * 3. As platformAdmin, create a community visibility level so communities can be
 *    created with a valid visibilityLevelCode.
 * 4. As reporter memberUser, create a community using the created visibility level
 *    code.
 * 5. As reporter memberUser, create a report that references a report reason
 *    category id and the created community id.
 * 6. As platformAdmin, create a user sanction via
 *    platformAdmin.userSanctions.create using
 *    ICommunityPlatformUserSanction.ICreate, pointing
 *    community_platform_report_id to the report.id, sanctioned_memberuser_id to
 *    the sanctioned user id, community_id to the created community.id, and
 *    filling sanction_type, status, effective_from, effective_until,
 *    reason_summary, notes_internal.
 * 7. Assert that the returned ICommunityPlatformUserSanction has a non-null id and
 *    that linked report, sanctioned_memberUser, and community references align
 *    with the created entities, plus scalar fields mirror the input payload.
 */
export async function test_api_platform_admin_create_user_sanction_for_reported_user(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Register reporter member user
  const reporterJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const reporterAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert(reporterAuth);

  // 2-b. Register sanctioned member user
  const sanctionedJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const sanctionedAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: sanctionedJoinBody,
    });
  typia.assert(sanctionedAuth);

  // 3. As platform admin, create a community visibility level to be referenced by communities
  // Ensure we are logged in as platform admin (join already sets Authorization header).
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "created visibility level code should match input",
    visibility.code,
    visibilityCode,
  );

  // 4. As reporter member user, login and create a community
  const reporterLoginBody = {
    identifier: reporterJoinBody.email,
    password: reporterJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.app.local/login",
    referrer: "https://community.app.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const reporterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: reporterLoginBody,
    });
  typia.assert(reporterLogin);

  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Sanctions",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 5. As reporter member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);
  TestValidator.equals(
    "report context community id should match created community",
    report.context_community?.id ?? null,
    community.id,
  );

  // 6. Switch back to platform admin to create a user sanction
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedAuth.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Violation of community rules based on report.",
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionCreateBody },
    );
  typia.assert(sanction);

  // 7. Validate created sanction matches input and relationships
  TestValidator.predicate(
    "sanction id should be a non-empty string",
    typeof sanction.id === "string" && sanction.id.length > 0,
  );

  TestValidator.equals(
    "sanction report id should equal referenced report",
    sanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanction sanctioned_memberUser id should match sanctioned user",
    sanction.sanctioned_memberUser.id,
    sanctionedAuth.id,
  );

  TestValidator.equals(
    "sanction community scope should match created community",
    sanction.community?.id ?? null,
    community.id,
  );

  TestValidator.equals(
    "sanction_type should mirror input",
    sanction.sanction_type,
    sanctionCreateBody.sanction_type,
  );

  TestValidator.equals(
    "status should mirror input",
    sanction.status,
    sanctionCreateBody.status,
  );

  TestValidator.equals(
    "effective_from should mirror input",
    sanction.effective_from,
    sanctionCreateBody.effective_from,
  );

  TestValidator.equals(
    "effective_until should mirror input",
    sanction.effective_until ?? null,
    sanctionCreateBody.effective_until ?? null,
  );

  TestValidator.equals(
    "reason_summary should mirror input",
    sanction.reason_summary ?? null,
    sanctionCreateBody.reason_summary ?? null,
  );

  TestValidator.equals(
    "notes_internal should mirror input",
    sanction.notes_internal ?? null,
    sanctionCreateBody.notes_internal ?? null,
  );
}
