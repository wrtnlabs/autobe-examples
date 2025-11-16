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

export async function test_api_user_sanction_update_switch_from_community_scoped_to_platform_wide(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "203.0.113.10",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const originalPlatformAdminEmail = platformAdminAuthorized.email;

  // 2. Register and authenticate a member user (to be sanctioned and reporter)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: "198.51.100.20",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const sanctionedMemberId = memberAuthorized.id;

  // Switch to memberUser context explicitly via login to align with typical flows
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "198.51.100.21",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 3. As memberUser, create a report motivating the sanction
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(report);

  // 4. As platformAdmin, create a community visibility level
  const platformAdminLoginBody = {
    identifier: originalPlatformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "203.0.113.11",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;

  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "created visibility level code matches request code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 5. Switch back to memberUser and create a community using the visibility level
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAgain);

  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Sanctions",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "created community identifier matches request identifier",
    community.identifier,
    communityIdentifier,
  );

  const communityId = community.id;

  // 6. Switch to platformAdmin and create a community-scoped user sanction
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: sanctionedMemberId,
    community_id: communityId,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Initial community-level sanction for test.",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(createdSanction);

  TestValidator.equals(
    "created sanction report id matches request report id",
    createdSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "created sanction member id matches sanctioned member",
    createdSanction.sanctioned_memberUser.id,
    sanctionedMemberId,
  );
  TestValidator.equals(
    "created sanction community is community-scoped",
    createdSanction.community?.id ?? null,
    communityId,
  );
  TestValidator.equals(
    "created sanction type is community scoped",
    createdSanction.sanction_type,
    "temporary_community_ban",
  );

  const originalCreatedAt = createdSanction.created_at;
  const originalUpdatedAt = createdSanction.updated_at;

  // 7. Update sanction to platform-wide: community_id -> null, sanction_type -> platform-wide type
  const updateBody = {
    sanction_type: "temporary_platform_ban",
    community_id: null,
    effective_from: createdSanction.effective_from,
    effective_until: createdSanction.effective_until,
    status: createdSanction.status,
    reason_summary: "Escalated to platform-wide temporary ban for test.",
    notes_internal: `${createdSanction.notes_internal ?? ""}\nEscalated scope to platform-wide for test scenario.`,
  } satisfies ICommunityPlatformUserSanction.IUpdate;

  const updatedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.update(
      connection,
      {
        userSanctionId: createdSanction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSanction);

  // 8. Validate invariants and scope change
  TestValidator.equals(
    "sanction id remains unchanged after update",
    updatedSanction.id,
    createdSanction.id,
  );
  TestValidator.equals(
    "sanction report association remains unchanged",
    updatedSanction.report.id,
    createdSanction.report.id,
  );
  TestValidator.equals(
    "sanctioned member association remains unchanged",
    updatedSanction.sanctioned_memberUser.id,
    createdSanction.sanctioned_memberUser.id,
  );

  TestValidator.equals(
    "updated sanction is now platform-wide (community null)",
    updatedSanction.community ?? null,
    null,
  );

  TestValidator.equals(
    "sanction type changed to platform-wide variant",
    updatedSanction.sanction_type,
    "temporary_platform_ban",
  );

  TestValidator.equals(
    "created_at remains stable after update",
    updatedSanction.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updatedSanction.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "status preserved across update",
    updatedSanction.status,
    createdSanction.status,
  );
}
