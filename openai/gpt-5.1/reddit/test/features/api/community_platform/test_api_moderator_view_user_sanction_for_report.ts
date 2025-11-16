import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Verify that a community moderator can view detailed user sanctions scoped to
 * a specific report.
 *
 * Business context:
 *
 * - A member user can file reports; moderators then create sanctions based on
 *   those reports.
 * - Sanctions can be platform-wide or scoped to a specific community.
 * - Moderators need to view the full sanction details for a given report to
 *   review enforcement.
 *
 * The test covers a realistic multi-actor workflow:
 *
 * 1. Register a member user (future sanction target) via /auth/memberUser/join.
 * 2. Log in as that member user (not strictly required because join already
 *    authenticates) and create a report via
 *    /communityPlatform/memberUser/reports.
 * 3. Register and log in a platform admin via /auth/platformAdmin/join to create a
 *    visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Switch back to the member user and create a community using the new
 *    visibility level via /communityPlatform/memberUser/communities, to
 *    exercise community-scoped sanctions.
 * 5. Register and log in a community moderator via /auth/communityModerator/join.
 * 6. As the moderator, create a new user sanction tied to the report via
 *    /communityPlatform/communityModerator/reports/{reportId}/userSanctions
 *    using a body matching ICommunityPlatformUserSanction.ICreate. Include:
 *
 *    - Community_platform_report_id equal to the created report id
 *    - Sanctioned_memberuser_id equal to the member user id
 *    - Community_id equal to the created community id (for scoping)
 *    - Sanction_type, status, effective_from, effective_until, reason_summary, and
 *         notes_internal.
 * 7. Still as the moderator, call GET
 *    /communityPlatform/communityModerator/reports/{reportId}/userSanctions/{userSanctionId}
 *    to retrieve that sanction.
 * 8. Assert with typia.assert that the response is a valid
 *    ICommunityPlatformUserSanction and with TestValidator that:
 *
 *    - Response.id === createdSanction.id
 *    - Response.report.id === report.id
 *    - Response.sanctioned_memberUser.id === memberUser.id
 *    - Response.community is defined and response.community.id === community.id
 *    - Response.sanction_type and status equal the values used at creation
 *    - Response.effective_from and effective_until match what was sent
 *    - Response.reason_summary and notes_internal are preserved
 *    - Response.created_at and updated_at are well-formed (implicitly validated by
 *         typia).
 * 9. As a platform admin, create an additional sanction using the
 *    /communityPlatform/platformAdmin/userSanctions endpoint to ensure that the
 *    moderator-scoped GET still points to the correct sanction bound to the
 *    given report id and sanction id.
 */
export async function test_api_moderator_view_user_sanction_for_report(
  connection: api.IConnection,
) {
  // 1. Register a member user (sanction target) and obtain IAuthorized.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 2. As the member user, create a report.
  const reportBody = {
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
        body: reportBody,
      },
    );
  typia.assert(report);

  // 3. Register a platform admin and create a visibility level.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const visibilityCode = `vis_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility",
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

  // 4. Switch back to member user and create a community using the visibility level code.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthAgain);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: "Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 5. Register and login a community moderator.
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuth);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthAgain: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthAgain);

  // 6. As moderator, create a community-scoped user sanction linked to the report.
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const moderatorSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Violation of community rules",
    notes_internal: "Initial moderator sanction for testing.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const moderatorSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: moderatorSanctionCreateBody,
      },
    );
  typia.assert(moderatorSanction);

  // 7. Retrieve the sanction via the moderator GET endpoint.
  const fetchedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.at(
      connection,
      {
        reportId: report.id,
        userSanctionId: moderatorSanction.id,
      },
    );
  typia.assert(fetchedSanction);

  // 8. Validate core links and fields.
  TestValidator.equals(
    "sanction id should match created sanction id",
    fetchedSanction.id,
    moderatorSanction.id,
  );

  TestValidator.equals(
    "sanction report id should match parent report id",
    fetchedSanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member user id should match member user id",
    fetchedSanction.sanctioned_memberUser.id,
    memberAuth.id,
  );

  TestValidator.predicate(
    "sanction should have a community scope",
    fetchedSanction.community !== null &&
      fetchedSanction.community !== undefined,
  );

  if (
    fetchedSanction.community !== null &&
    fetchedSanction.community !== undefined
  ) {
    TestValidator.equals(
      "sanction community id should match created community id",
      fetchedSanction.community.id,
      community.id,
    );
  }

  TestValidator.equals(
    "sanction_type should be preserved",
    fetchedSanction.sanction_type,
    moderatorSanctionCreateBody.sanction_type,
  );

  TestValidator.equals(
    "status should be preserved",
    fetchedSanction.status,
    moderatorSanctionCreateBody.status,
  );

  TestValidator.equals(
    "effective_from should be preserved",
    fetchedSanction.effective_from,
    moderatorSanctionCreateBody.effective_from,
  );

  TestValidator.equals(
    "effective_until should be preserved",
    fetchedSanction.effective_until,
    moderatorSanctionCreateBody.effective_until,
  );

  TestValidator.equals(
    "reason_summary should be preserved",
    fetchedSanction.reason_summary,
    moderatorSanctionCreateBody.reason_summary,
  );

  TestValidator.equals(
    "notes_internal should be preserved",
    fetchedSanction.notes_internal,
    moderatorSanctionCreateBody.notes_internal,
  );

  // typia.assert has already validated created_at/updated_at as date-time strings.

  // 9. As platform admin, create another sanction using the platformAdmin endpoint
  //    to ensure moderator GET still targets only the report-scoped sanction.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthAgain);

  const adminSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuth.id,
    community_id: null,
    sanction_type: "warning",
    status: "scheduled",
    effective_from: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    effective_until: null,
    reason_summary: "Platform-level warning for analytics comparison",
    notes_internal: "PlatformAdmin-created sanction for cross-path validation.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const adminSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: adminSanctionCreateBody,
      },
    );
  typia.assert(adminSanction);

  // Confirm that the previously fetched moderator sanction is still the one bound
  // to the (reportId, userSanctionId) pair we used, by re-fetching.
  const reFetchedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.at(
      connection,
      {
        reportId: report.id,
        userSanctionId: moderatorSanction.id,
      },
    );
  typia.assert(reFetchedSanction);

  TestValidator.equals(
    "re-fetched sanction still matches the moderator-created sanction",
    reFetchedSanction.id,
    moderatorSanction.id,
  );
}
