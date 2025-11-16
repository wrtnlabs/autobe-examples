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
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionStatistics";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_statistics_filtered_by_action_type_and_time(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;

  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 2. Member user joins and creates a community and a report
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: "192.168.0.10",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUserAuthorized);

  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // Synthetic reason category id for the report (no listing/creation API provided)
  const fakeReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: fakeReasonCategoryId,
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Community moderator joins and logs in, then creates two moderation actions
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(2),
    ip: "10.0.0.5",
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // Ensure we are authenticated as the moderator (login again using identifier/password)
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "10.0.0.5",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginResult,
  );

  const firstActionType = "remove_content";
  const secondActionType = "warn_user";

  const firstModerationActionBody = {
    community_id: community.id,
    action_type: firstActionType,
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const firstModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: firstModerationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(firstModerationAction);

  const secondModerationActionBody = {
    community_id: community.id,
    action_type: secondActionType,
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const secondModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: secondModerationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(secondModerationAction);

  // 4. Build a statistics request filtering by the first action type and a time window around now
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000);
  const toDate = new Date(now.getTime() + 5 * 60 * 1000);

  const statsRequestBody = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: [firstActionType],
    communityIds: undefined,
    userIds: undefined,
    groupBy: ["actionType", "actorType"],
    timeGranularity: undefined,
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const stats: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert<ICommunityPlatformModerationActionStatistics>(stats);

  const totalActions: number = stats.totalActions;

  // Basic totalActions sanity checks
  TestValidator.predicate(
    "totalActions should be non-negative",
    totalActions >= 0,
  );

  // If actionsByType is present, ensure all buckets correspond only to filtered actionTypes
  if (stats.actionsByType !== undefined) {
    const sumByType: number = stats.actionsByType.reduce((acc, bucket) => {
      TestValidator.predicate(
        "actionTypes bucket must be in filter list",
        statsRequestBody.actionTypes === undefined ||
          statsRequestBody.actionTypes.includes(bucket.actionType),
      );
      return acc + bucket.count;
    }, 0);

    TestValidator.equals(
      "sum of actionsByType buckets should equal totalActions",
      totalActions,
      sumByType,
    );
  }

  // If actionsByActorType is present, check bucket sum equals totalActions
  if (stats.actionsByActorType !== undefined) {
    const sumByActorType: number = stats.actionsByActorType.reduce(
      (acc, bucket) => acc + bucket.count,
      0,
    );

    TestValidator.equals(
      "sum of actionsByActorType buckets should equal totalActions",
      totalActions,
      sumByActorType,
    );
  }

  // 5. Second statistics call with an earlier time window (sanity/typing only)
  const earlierFrom = new Date(now.getTime() - 20 * 60 * 1000);
  const earlierTo = new Date(now.getTime() - 10 * 60 * 1000);

  const earlierStatsRequestBody = {
    from: earlierFrom.toISOString(),
    to: earlierTo.toISOString(),
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: [firstActionType],
    communityIds: undefined,
    userIds: undefined,
    groupBy: ["actionType", "actorType"],
    timeGranularity: undefined,
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const earlierStats: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      {
        body: earlierStatsRequestBody,
      },
    );
  typia.assert<ICommunityPlatformModerationActionStatistics>(earlierStats);
}
