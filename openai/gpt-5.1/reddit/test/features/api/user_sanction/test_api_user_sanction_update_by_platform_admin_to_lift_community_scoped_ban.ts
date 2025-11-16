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
 * Validate that a platform administrator can lift a community-scoped user
 * sanction.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Member user joins and becomes authenticated.
 * 3. Platform admin creates a community visibility level.
 * 4. Member user creates a community using that visibility level.
 * 5. Member user submits a report scoped to that community.
 * 6. Platform admin creates a generic user sanction (sanity check for create API).
 * 7. Platform admin creates a community-scoped user sanction for the member user,
 *    tied to the report and community.
 * 8. Platform admin updates the sanction to revoke (lift) the ban by changing
 *    status and effective_until and updating rationale text.
 * 9. The updated sanction is validated to ensure:
 *
 *    - Same report and community linkage.
 *    - Same sanction_type.
 *    - Status changes from active to revoked.
 *    - Effective_until is shortened to around "now".
 *    - Reason_summary and notes_internal reflect the update.
 */
export async function test_api_user_sanction_update_by_platform_admin_to_lift_community_scoped_ban(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (authenticated as platformAdmin)
  const adminJoinHref = "https://admin.example.com/join" as string &
    tags.Format<"uri">;
  const adminJoinReferrer = "https://admin.example.com/landing" as string &
    tags.Format<"uri">;

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: adminJoinHref,
    referrer: adminJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Member user joins (this will be the sanctioned user and reporter)
  const memberJoinHref = "https://app.example.com/signup" as string &
    tags.Format<"uri">;
  const memberJoinReferrer = "https://app.example.com/home" as string &
    tags.Format<"uri">;

  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: "198.51.100.20",
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 3. Create a visibility level as platform admin.
  //    Ensure we are authenticated as platform admin again (join already set header, but be explicit via login).
  const adminLoginHref = "https://admin.example.com/login" as string &
    tags.Format<"uri">;
  const adminLoginReferrer = "https://admin.example.com/landing" as string &
    tags.Format<"uri">;

  const adminLoginBody = {
    identifier: platformAdmin.email,
    password: adminJoinBody.password,
    ip: "203.0.113.11",
    href: adminLoginHref,
    referrer: adminLoginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
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

  // 4. Member user logs in (for completeness) and creates a community using this visibility level.
  const memberLoginHref = "https://app.example.com/login" as string &
    tags.Format<"uri">;
  const memberLoginReferrer = "https://app.example.com/home" as string &
    tags.Format<"uri">;

  const memberLoginBody = {
    identifier: memberUser.email,
    password: memberPassword,
    ip: "198.51.100.21",
    href: memberLoginHref,
    referrer: memberLoginReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 5. Member user submits a report in this community.
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
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6. As platform admin, log back in and create a generic user sanction using the global create endpoint.
  const adminReloginBody = {
    identifier: platformAdmin.email,
    password: adminJoinBody.password,
    ip: "203.0.113.12",
    href: adminLoginHref,
    referrer: adminLoginReferrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminReloginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloginResult);

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const future = new Date(now.getTime() + oneDayMs);

  const genericSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUser.id,
    community_id: null,
    sanction_type: "warning",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: future.toISOString(),
    reason_summary:
      "Initial generic warning sanction created for sanity check.",
    notes_internal:
      "Generic sanction created by test to validate global pipeline.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const genericSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: genericSanctionCreateBody,
      },
    );
  typia.assert(genericSanction);

  // 7. Create a community-scoped user sanction linked to the report and community.
  const communityBanEffectiveFrom = now.toISOString();
  const communityBanEffectiveUntil = future.toISOString();

  const communityBanCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberUser.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: communityBanEffectiveFrom,
    effective_until: communityBanEffectiveUntil,
    reason_summary: "Temporary community ban due to reported behavior.",
    notes_internal: "Initial community ban issued pending appeal.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const communityBan: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: communityBanCreateBody,
      },
    );
  typia.assert(communityBan);

  // Capture original fields to compare later.
  const originalSanctionType = communityBan.sanction_type;
  const originalStatus = communityBan.status;
  const originalEffectiveFrom = communityBan.effective_from;
  const originalEffectiveUntil = communityBan.effective_until ?? undefined;
  const originalReportId = communityBan.report.id;
  const originalCommunityId = communityBan.community?.id ?? null;

  // Basic sanity assertions on creation.
  TestValidator.equals(
    "community-scoped sanction is linked to provided report",
    communityBan.report.id,
    report.id,
  );
  if (communityBan.community !== null && communityBan.community !== undefined) {
    TestValidator.equals(
      "community-scoped sanction is linked to provided community",
      communityBan.community.id,
      community.id,
    );
  }
  TestValidator.equals(
    "sanction type is temporary_community_ban at creation",
    communityBan.sanction_type,
    "temporary_community_ban",
  );
  TestValidator.equals(
    "status is active at creation",
    communityBan.status,
    "active",
  );

  // 8. Update the sanction to revoke (lift) the ban.
  const liftTime = new Date();
  const liftedEffectiveUntil = liftTime.toISOString();

  const revokeUpdateBody = {
    status: "revoked",
    effective_until: liftedEffectiveUntil,
    reason_summary: "Community ban lifted after successful appeal and review.",
    notes_internal:
      "Sanction revoked by platform admin after verifying context; user restored.",
  } satisfies ICommunityPlatformUserSanction.IUpdate;

  const updatedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.reports.userSanctions.update(
      connection,
      {
        reportId: report.id,
        userSanctionId: communityBan.id,
        body: revokeUpdateBody,
      },
    );
  typia.assert(updatedSanction);

  // 9. Validate linkage stability and status / temporal transitions.

  // Sanction remains associated with same report and community.
  TestValidator.equals(
    "updated sanction remains linked to same report",
    updatedSanction.report.id,
    originalReportId,
  );
  if (originalCommunityId !== null) {
    TestValidator.predicate(
      "updated sanction still has non-null community when originally community-scoped",
      updatedSanction.community !== null &&
        updatedSanction.community !== undefined,
    );
    if (
      updatedSanction.community !== null &&
      updatedSanction.community !== undefined
    ) {
      TestValidator.equals(
        "updated sanction remains linked to same community",
        updatedSanction.community.id,
        originalCommunityId,
      );
    }
  } else {
    TestValidator.equals(
      "sanction without original community remains community-null",
      updatedSanction.community,
      null,
    );
  }

  // Sanction type remains unchanged.
  TestValidator.equals(
    "sanction type is unchanged after revoke",
    updatedSanction.sanction_type,
    originalSanctionType,
  );

  // Status transitioned from active to revoked.
  TestValidator.equals("original status is active", originalStatus, "active");
  TestValidator.equals(
    "status has transitioned to revoked",
    updatedSanction.status,
    "revoked",
  );

  // effective_from unchanged.
  TestValidator.equals(
    "effective_from remains unchanged after revoke",
    updatedSanction.effective_from,
    originalEffectiveFrom,
  );

  // effective_until shortened to around now (not later than original if original existed).
  if (originalEffectiveUntil !== undefined) {
    const originalUntilMillis = Date.parse(originalEffectiveUntil);
    const updatedUntilMillis = Date.parse(
      updatedSanction.effective_until ?? "",
    );

    TestValidator.predicate(
      "updated effective_until is not later than original effective_until",
      !Number.isNaN(originalUntilMillis) &&
        !Number.isNaN(updatedUntilMillis) &&
        updatedUntilMillis <= originalUntilMillis,
    );
  }

  // reason_summary and notes_internal updated as requested.
  TestValidator.equals(
    "reason_summary reflects lift rationale",
    updatedSanction.reason_summary,
    revokeUpdateBody.reason_summary,
  );
  TestValidator.equals(
    "notes_internal reflects internal lift notes",
    updatedSanction.notes_internal,
    revokeUpdateBody.notes_internal,
  );
}
