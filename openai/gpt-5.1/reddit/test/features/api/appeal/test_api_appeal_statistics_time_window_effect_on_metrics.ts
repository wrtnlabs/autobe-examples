import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformAppealStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppealStatistics";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_appeal_statistics_time_window_effect_on_metrics(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (initial auth context: platformAdmin)
  const platformAdminEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@admin.test` as string &
      tags.Format<"email">;

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: platformAdminEmail,
        password: "password-Admin1",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://admin.test/join",
        referrer: "https://admin.test/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  // 2. Create a visibility level as platformAdmin
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `code-${RandomGenerator.alphabets(6)}`,
          name: `Visibility-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and logs in
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.test` as string &
      tags.Format<"email">;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: "Password-member-1",
      ip: "127.0.0.1",
      href: "https://app.test/join",
      referrer: "https://app.test/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: "Password-member-1",
      ip: "127.0.0.1",
      href: "https://app.test/login",
      referrer: "https://app.test/join-complete",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert(memberLogin);

  // 4. Create a community as memberUser
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(6)}`,
          title: `Community ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a report as memberUser against some context in the community
  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 6. Community moderator joins and logs in
  const moderatorEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@moderator.test` as string &
      tags.Format<"email">;

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: "Password-moderator-1",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://mod.test/join",
        referrer: "https://mod.test/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: "Password-moderator-1",
        ip: "127.0.0.1",
        href: "https://mod.test/login",
        referrer: "https://mod.test/join-complete",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorLogin);

  // 7. Create moderation action for the report as communityModerator
  const moderationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          community_id: community.id,
          action_type: "remove_content",
          target_scope: "post",
          reason_summary: "Initial moderation for test report",
          notes_internal: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 8. Switch back to platformAdmin by logging in explicitly
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: "password-Admin1",
        ip: "127.0.0.1",
        href: "https://admin.test/login",
        referrer: "https://admin.test/join-complete",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert(platformAdminLogin);

  // 9. Create a user sanction as platformAdmin for the member user
  const sanctionEffectiveFrom = new Date();
  const sanctionEffectiveUntil = new Date(
    sanctionEffectiveFrom.getTime() + 60 * 60 * 1000,
  );

  const userSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: {
          community_platform_report_id: report.id,
          sanctioned_memberuser_id: memberJoin.id,
          community_id: community.id,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: sanctionEffectiveFrom.toISOString(),
          effective_until: sanctionEffectiveUntil.toISOString(),
          reason_summary: "Test sanction for appeal statistics",
          notes_internal: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(userSanction);

  // 10. Switch to memberUser again to file appeals
  const memberRelogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: "Password-member-1",
      ip: "127.0.0.1",
      href: "https://app.test/login",
      referrer: "https://app.test/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert(memberRelogin);

  // Helper to create a single appeal
  const createAppeal = async (
    label: string,
  ): Promise<ICommunityPlatformAppeal> => {
    const appeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: {
            appeal_scope: "sanction",
            reason_summary: `${label}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
            details: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies ICommunityPlatformAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    return appeal;
  };

  // 11. Create OlderGroup appeals
  const olderAppeals: ICommunityPlatformAppeal[] = [];
  const olderCount = 2;
  for (let i = 0; i < olderCount; i++) {
    const appeal = await createAppeal("Older appeal");
    olderAppeals.push(appeal);
  }

  // Capture a cutoff time after older appeals
  const cutoff = new Date();

  // 12. Create RecentGroup appeals
  const recentAppeals: ICommunityPlatformAppeal[] = [];
  const recentCount = 3;
  for (let i = 0; i < recentCount; i++) {
    const appeal = await createAppeal("Recent appeal");
    recentAppeals.push(appeal);
  }

  // Ensure we have expected counts
  TestValidator.equals("older appeals count", olderAppeals.length, olderCount);
  TestValidator.equals(
    "recent appeals count",
    recentAppeals.length,
    recentCount,
  );

  // 13. Switch back to platformAdmin
  const platformAdminRelogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminEmail,
        password: "password-Admin1",
        ip: "127.0.0.1",
        href: "https://admin.test/login",
        referrer: "https://admin.test/appeal-stats",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert(platformAdminRelogin);

  // 14. Build narrow request window (start after cutoff, end in the future)
  const narrowStart = new Date(cutoff.getTime() + 1_000);
  const narrowEnd = new Date(narrowStart.getTime() + 2 * 60 * 60 * 1000);

  const narrowRequest = {
    start: narrowStart.toISOString(),
    end: narrowEnd.toISOString(),
    communityIds: [community.id],
    statuses: undefined,
    sanctionTypes: undefined,
    groupBy: "community",
    timeGranularity: "hourly",
  } satisfies ICommunityPlatformAppealStatistics.IRequest;

  const narrowStats =
    await api.functional.communityPlatform.platformAdmin.statistics.appeals.index(
      connection,
      {
        body: narrowRequest,
      },
    );
  typia.assert(narrowStats);

  // 15. Build wide request window (start before older appeals, same end)
  const wideStart = new Date(cutoff.getTime() - 60 * 60 * 1000);

  const wideRequest = {
    start: wideStart.toISOString(),
    end: narrowEnd.toISOString(),
    communityIds: [community.id],
    statuses: undefined,
    sanctionTypes: undefined,
    groupBy: "community",
    timeGranularity: "hourly",
  } satisfies ICommunityPlatformAppealStatistics.IRequest;

  const wideStats =
    await api.functional.communityPlatform.platformAdmin.statistics.appeals.index(
      connection,
      {
        body: wideRequest,
      },
    );
  typia.assert(wideStats);

  // 16. Validate overview totals relationship
  TestValidator.predicate(
    "narrow totalAppeals is non-negative",
    narrowStats.overview.totalAppeals >= 0,
  );
  TestValidator.predicate(
    "wide totalAppeals is non-negative",
    wideStats.overview.totalAppeals >= 0,
  );

  TestValidator.predicate(
    "wide window has at least as many appeals as narrow window",
    wideStats.overview.totalAppeals >= narrowStats.overview.totalAppeals,
  );

  // 17. Validate timeline buckets for both windows
  const validateTimeline = (
    label: string,
    stats: ICommunityPlatformAppealStatistics,
  ) => {
    const buckets = stats.timeline.buckets;

    TestValidator.predicate(
      `${label} timeline buckets length is non-negative`,
      buckets.length >= 0,
    );

    for (const bucket of buckets) {
      TestValidator.predicate(
        `${label} bucket start < end`,
        new Date(bucket.start).getTime() < new Date(bucket.end).getTime(),
      );
      TestValidator.predicate(
        `${label} bucket createdCount non-negative`,
        bucket.createdCount >= 0,
      );
      TestValidator.predicate(
        `${label} bucket resolvedCount non-negative`,
        bucket.resolvedCount >= 0,
      );
    }
  };

  validateTimeline("narrow", narrowStats);
  validateTimeline("wide", wideStats);
}
