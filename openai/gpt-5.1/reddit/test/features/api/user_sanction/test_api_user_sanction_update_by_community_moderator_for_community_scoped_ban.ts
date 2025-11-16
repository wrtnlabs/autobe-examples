import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a community moderator can update a community-scoped user
 * sanction linked to a specific report after all prerequisite entities are
 * created.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a community visibility level to be used by
 *    communities.
 * 2. Member user joins, creates a community with that visibility level, subscribes
 *    to it, and creates a report scoped to that community.
 * 3. Platform admin creates a baseline platform-level sanction tied to the report
 *    and member user (for model integrity only).
 * 4. Community moderator joins and creates a community-scoped user sanction for
 *    the member user under the report.
 * 5. Community moderator updates the sanction via PUT, changing status, duration,
 *    and descriptive fields.
 * 6. The updated sanction is asserted to preserve immutable associations and
 *    reflect updated mutable fields.
 */
export async function test_api_user_sanction_update_by_community_moderator_for_community_scoped_ban(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (implicitly authenticates as platformAdmin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for community-scoped sanction testing.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code must match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins (implicitly authenticates as memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: "MemberP@ss1",
    ip: RandomGenerator.alphabets(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community using the visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: "Sanction Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member user subscribes to that community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community id must match community",
    subscription.community_id,
    community.id,
  );

  // 6. Member user creates a report scoped to the community
  const reportReasonCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
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

  // 7. Switch back to platformAdmin via login, then create a platform-level sanction
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: "P@ssw0rd!",
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const platformSanctionEffectiveFrom = new Date().toISOString();
  const platformSanctionEffectiveUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const platformSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: null,
    sanction_type: "temporary_platform_ban",
    status: "active",
    effective_from: platformSanctionEffectiveFrom,
    effective_until: platformSanctionEffectiveUntil,
    reason_summary: "Baseline platform-level sanction for integrity test",
    notes_internal: "Created by platformAdmin as part of E2E scenario.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const platformSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: platformSanctionCreateBody },
    );
  typia.assert(platformSanction);
  TestValidator.equals(
    "platform sanction should be platform scoped (no community)",
    platformSanction.community,
    null,
  );

  // 8. Community moderator joins (implicitly authenticates as communityModerator)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: "ModeratorP@ss1",
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 9. Community moderator creates a community-scoped user sanction linked to the report
  const communitySanctionEffectiveFrom = new Date().toISOString();
  const communitySanctionEffectiveUntil = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const communitySanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: communitySanctionEffectiveFrom,
    effective_until: communitySanctionEffectiveUntil,
    reason_summary: "Initial community-scoped ban due to report.",
    notes_internal: "Created by community moderator for sanction update test.",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdCommunitySanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId: report.id,
        body: communitySanctionCreateBody,
      },
    );
  typia.assert(createdCommunitySanction);

  TestValidator.equals(
    "created sanction must be linked to the report",
    createdCommunitySanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "created sanction must target the member user",
    createdCommunitySanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "created sanction must be scoped to the community",
    createdCommunitySanction.community?.id ?? null,
    community.id,
  );

  // 10. Community moderator updates the sanction (status, effective_until, reasons)
  const updatedEffectiveUntil = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody: ICommunityPlatformUserSanction.IUpdate = {
    status: "revoked",
    effective_until: updatedEffectiveUntil,
    reason_summary: "Sanction revoked earlier after successful appeal.",
    notes_internal: "Updated by community moderator to shorten ban window.",
    community_id: community.id,
  };

  const updatedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.update(
      connection,
      {
        reportId: report.id,
        userSanctionId: createdCommunitySanction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSanction);

  // 11. Assertions: immutable linkages preserved, mutable fields updated
  TestValidator.equals(
    "sanction id must remain unchanged after update",
    updatedSanction.id,
    createdCommunitySanction.id,
  );
  TestValidator.equals(
    "report linkage must remain unchanged after update",
    updatedSanction.report.id,
    report.id,
  );
  TestValidator.equals(
    "sanctioned member user must remain unchanged after update",
    updatedSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "community scope must remain the same after update",
    updatedSanction.community?.id ?? null,
    community.id,
  );

  TestValidator.equals(
    "sanction status must be updated to revoked",
    updatedSanction.status,
    "revoked",
  );
  TestValidator.equals(
    "sanction effective_until must be updated to the new value",
    updatedSanction.effective_until ?? null,
    updatedEffectiveUntil,
  );
  TestValidator.equals(
    "sanction reason_summary must be updated",
    updatedSanction.reason_summary ?? null,
    updateBody.reason_summary ?? null,
  );
  TestValidator.equals(
    "sanction notes_internal must be updated",
    updatedSanction.notes_internal ?? null,
    updateBody.notes_internal ?? null,
  );

  // Temporal consistency: effective_until should be on or after effective_from
  TestValidator.predicate(
    "effective_until must be on or after effective_from",
    new Date(
      updatedSanction.effective_until ?? updatedEffectiveUntil,
    ).getTime() >= new Date(updatedSanction.effective_from).getTime(),
  );
}
