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
 * Validate that a community moderator can create a community-scoped user
 * sanction from a report.
 *
 * Business flow:
 *
 * 1. Community moderator self-registers.
 * 2. Member user (sanction target) self-registers.
 * 3. Platform admin self-registers.
 * 4. Platform admin creates a community visibility level master (code used by
 *    communities).
 * 5. Member user creates a community referencing the visibility level code.
 * 6. Member user creates a report in the context of that community.
 * 7. Community moderator creates a community-scoped user sanction for the member
 *    based on the report.
 * 8. Validate that the sanction is correctly linked to report, member, and
 *    community and that timing fields and basic attributes match the request.
 */
export async function test_api_moderator_creates_community_scoped_user_sanction(
  connection: api.IConnection,
) {
  // 1. Register a community moderator (join implicitly authenticates and sets token on connection)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `moderator+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 2. Register the target member user (will overwrite Authorization header to member context)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const sanctionedMemberId: string & tags.Format<"uuid"> =
    memberAuthorized.id as string & tags.Format<"uuid">;

  // 3. Register a platform admin (will swap Authorization to platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 4. As platform admin, create a community visibility level
  const visibilityCode = `test_public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Public Visibility",
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

  TestValidator.equals(
    "visibility level code matches request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch back to member user by logging in (ensuring member context)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 6. As member user, create a community referencing the visibility level code
  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Sanction Flow",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
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
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 7. As member user, create a report within that community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  if (
    report.context_community !== null &&
    report.context_community !== undefined
  ) {
    TestValidator.equals(
      "report context community id matches created community when present",
      report.context_community.id,
      community.id,
    );
  }

  // 8. Switch to community moderator account via login to create the sanction
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://moderator.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://moderator.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAfterLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAfterLogin);

  // 9. As community moderator, create a community-scoped user sanction
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const sanctionType = "temporary_community_ban";
  const sanctionStatus = "active";

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedMemberId,
    community_id: community.id,
    sanction_type: sanctionType,
    status: sanctionStatus,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Violation of community rules in test scenario",
    notes_internal: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // 10. Business validations: ensure sanction and associations match expectations
  TestValidator.equals(
    "sanction report id matches originating report",
    sanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member user id matches the target member",
    sanction.sanctioned_memberUser.id,
    sanctionedMemberId,
  );

  TestValidator.equals(
    "sanction is scoped to the created community",
    sanction.community?.id ?? null,
    community.id,
  );

  TestValidator.equals(
    "sanction type is temporary community ban",
    sanction.sanction_type,
    sanctionType,
  );

  TestValidator.equals(
    "sanction status matches requested status",
    sanction.status,
    sanctionStatus,
  );

  TestValidator.equals(
    "sanction effective_from matches requested value",
    sanction.effective_from,
    effectiveFrom,
  );

  TestValidator.equals(
    "sanction effective_until matches requested value",
    sanction.effective_until ?? null,
    effectiveUntil,
  );
}
