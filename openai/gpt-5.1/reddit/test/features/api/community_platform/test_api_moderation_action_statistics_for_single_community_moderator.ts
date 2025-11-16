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

export async function test_api_moderation_action_statistics_for_single_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register platform admin and create visibility level
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(16),
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register member user and create a community
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      ip: null,
      href: "https://app.example.com/signup",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: `Community ${RandomGenerator.paragraph({ sentences: 1 })}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. As member, create a report scoping to the community
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: reportReasonCategoryId,
          community_id: community.id,
          severity: "medium",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  // 4. Register community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(14);

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://moderator.example.com/join",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorJoin);

  // 5. Login as community moderator to ensure session context is fresh
  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://moderator.example.com/login",
        referrer: "https://moderator.example.com/landing",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert(moderatorLogin);

  // 6. Record a moderation action for the community
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const actionType = "ban_user";
  const targetScope = "user";

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          community_id: community.id,
          action_type: actionType,
          target_scope: targetScope,
          reason_summary: "Test ban for statistics aggregation",
          notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  // 7. Fetch statistics including this moderation action
  const stats =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      {
        body: {
          from,
          to,
          actorTypes: ["communityModerator"],
          targetEntityTypes: [targetScope],
          actionTypes: [actionType],
          communityIds: [community.id],
          userIds: [],
          groupBy: ["actionType", "actorType", "community", "time"],
          timeGranularity: "daily",
        } satisfies ICommunityPlatformModerationActionStatistics.IRequest,
      },
    );
  typia.assert(stats);

  // Basic totalActions validation
  TestValidator.predicate(
    "totalActions should be at least 1 for the created moderation action",
    stats.totalActions >= 1,
  );

  // Validate actionsByType bucket
  if (stats.actionsByType && stats.actionsByType.length > 0) {
    const typeBucket = stats.actionsByType.find(
      (b) => b.actionType === actionType,
    );
    TestValidator.predicate(
      "actionsByType should contain the chosen action type with count >= 1",
      !!typeBucket && typeBucket.count >= 1,
    );
  } else {
    TestValidator.predicate(
      "actionsByType should be defined when grouping by actionType",
      false,
    );
  }

  // Validate actionsByActorType bucket
  if (stats.actionsByActorType && stats.actionsByActorType.length > 0) {
    const actorBucket = stats.actionsByActorType.find(
      (b) => b.actorType === "communityModerator",
    );
    TestValidator.predicate(
      "actionsByActorType should contain communityModerator with count >= 1",
      !!actorBucket && actorBucket.count >= 1,
    );
  } else {
    TestValidator.predicate(
      "actionsByActorType should be defined when grouping by actorType",
      false,
    );
  }

  // Validate actionsByCommunity bucket
  if (stats.actionsByCommunity && stats.actionsByCommunity.length > 0) {
    const communityBucket = stats.actionsByCommunity.find(
      (b) => b.communityId === community.id,
    );
    TestValidator.predicate(
      "actionsByCommunity should contain the test community with count >= 1",
      !!communityBucket && communityBucket.count >= 1,
    );
  } else {
    TestValidator.predicate(
      "actionsByCommunity should be defined when grouping by community",
      false,
    );
  }

  // Validate timeSeries buckets if present
  if (stats.timeSeries && stats.timeSeries.length > 0) {
    const anyNonZero = stats.timeSeries.some((b) => b.count >= 1);
    TestValidator.predicate(
      "timeSeries should contain at least one bucket with count >= 1",
      anyNonZero,
    );
  }

  // 8. Negative case: ask for statistics in a window before the action was created
  const beforeFrom = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const beforeTo = new Date(now.getTime() - 55 * 60 * 1000).toISOString();

  const emptyStats =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      {
        body: {
          from: beforeFrom,
          to: beforeTo,
          actorTypes: ["communityModerator"],
          targetEntityTypes: [targetScope],
          actionTypes: [actionType],
          communityIds: [community.id],
          userIds: [],
          groupBy: ["actionType", "actorType", "community", "time"],
          timeGranularity: "daily",
        } satisfies ICommunityPlatformModerationActionStatistics.IRequest,
      },
    );
  typia.assert(emptyStats);

  TestValidator.predicate(
    "totalActions should be 0 for a time window before the moderation action",
    emptyStats.totalActions === 0,
  );

  if (emptyStats.actionsByType) {
    const anyBucketWithCount = emptyStats.actionsByType.some(
      (b) => b.count > 0,
    );
    TestValidator.predicate(
      "actionsByType buckets should all have count 0 in the empty window",
      !anyBucketWithCount,
    );
  }

  if (emptyStats.actionsByActorType) {
    const anyBucketWithCount = emptyStats.actionsByActorType.some(
      (b) => b.count > 0,
    );
    TestValidator.predicate(
      "actionsByActorType buckets should all have count 0 in the empty window",
      !anyBucketWithCount,
    );
  }

  if (emptyStats.actionsByCommunity) {
    const anyBucketWithCount = emptyStats.actionsByCommunity.some(
      (b) => b.count > 0,
    );
    TestValidator.predicate(
      "actionsByCommunity buckets should all have count 0 in the empty window",
      !anyBucketWithCount,
    );
  }

  if (emptyStats.timeSeries) {
    const anyBucketWithCount = emptyStats.timeSeries.some((b) => b.count > 0);
    TestValidator.predicate(
      "timeSeries buckets should all have count 0 in the empty window",
      !anyBucketWithCount,
    );
  }
}
