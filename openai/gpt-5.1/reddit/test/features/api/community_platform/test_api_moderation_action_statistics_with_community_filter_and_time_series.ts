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

export async function test_api_moderation_action_statistics_with_community_filter_and_time_series(
  connection: api.IConnection,
) {
  // 1. Register a member user and keep their credentials for later login.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email:
      RandomGenerator.alphabets(8) +
      "@" +
      RandomGenerator.alphabets(5) +
      ".com",
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register a platform admin and create a visibility level.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email:
      RandomGenerator.alphabets(8) +
      "@" +
      RandomGenerator.alphabets(5) +
      ".com",
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCode = "public_" + RandomGenerator.alphabets(6);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility " + RandomGenerator.alphabets(4),
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

  // 3. Switch to member user context for community and report creation.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAgain);

  // Create two communities: community A and community B.
  const communityACreateBody = {
    identifier: "community-a-" + RandomGenerator.alphabets(6),
    title: "Community A " + RandomGenerator.alphabets(5),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  const communityBCreateBody = {
    identifier: "community-b-" + RandomGenerator.alphabets(6),
    title: "Community B " + RandomGenerator.alphabets(5),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 4. Create at least one report per community.
  const reportBodies: ICommunityPlatformReport.ICreate[] = [
    {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: communityA.id,
      severity: "low",
      description: RandomGenerator.paragraph({ sentences: 6 }),
    },
    {
      reporter_type: "member",
      report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
      community_id: communityB.id,
      severity: "medium",
      description: RandomGenerator.paragraph({ sentences: 6 }),
    },
  ];

  const reports: ICommunityPlatformReport[] = [];
  for (const body of reportBodies) {
    const created: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body },
      );
    typia.assert(created);
    reports.push(created);
  }

  // 5. Create and authenticate a community moderator.
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email:
      RandomGenerator.alphabets(8) +
      "@" +
      RandomGenerator.alphabets(5) +
      ".com",
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. As the community moderator, create moderation actions in both communities.
  const actionTypesA = ["remove_content", "warn_user"] as const;
  const actionTypesB = ["remove_content", "lock_thread"] as const;

  const actionsForA: ICommunityPlatformModerationAction[] = [];
  const actionsForB: ICommunityPlatformModerationAction[] = [];

  const communityAActionBodies: ICommunityPlatformModerationAction.ICreate[] = [
    {
      community_id: communityA.id,
      action_type: actionTypesA[0],
      target_scope: "post",
      reason_summary: "Remove spam post in community A",
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    },
    {
      community_id: communityA.id,
      action_type: actionTypesA[0],
      target_scope: "comment",
      reason_summary: "Remove abusive comment in community A",
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    },
    {
      community_id: communityA.id,
      action_type: actionTypesA[1],
      target_scope: "user",
      reason_summary: "Warn user for borderline content in community A",
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    },
  ];

  for (const body of communityAActionBodies) {
    const created: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.moderationActions.create(
        connection,
        { body },
      );
    typia.assert(created);
    actionsForA.push(created);
  }

  const communityBActionBodies: ICommunityPlatformModerationAction.ICreate[] = [
    {
      community_id: communityB.id,
      action_type: actionTypesB[0],
      target_scope: "post",
      reason_summary: "Remove off-topic post in community B",
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    },
    {
      community_id: communityB.id,
      action_type: actionTypesB[1],
      target_scope: "thread",
      reason_summary: "Lock heated thread in community B",
      notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
    },
  ];

  for (const body of communityBActionBodies) {
    const created: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.communityModerator.moderationActions.create(
        connection,
        { body },
      );
    typia.assert(created);
    actionsForB.push(created);
  }

  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000);
  const toDate = new Date(now.getTime() + 5 * 60 * 1000);

  const fromStr = fromDate.toISOString();
  const toStr = toDate.toISOString();

  // 7. Build statistics request for community A only.
  const statsRequestForA = {
    from: fromStr,
    to: toStr,
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: undefined,
    communityIds: [communityA.id],
    userIds: undefined,
    groupBy: ["community", "time", "actionType"],
    timeGranularity: "daily",
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const statsForA: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      { body: statsRequestForA },
    );
  typia.assert(statsForA);

  const expectedCountA = actionsForA.length;

  TestValidator.equals(
    "totalActions reflects number of actions for community A only",
    statsForA.totalActions,
    expectedCountA,
  );

  // Validate actionsByCommunity
  TestValidator.predicate(
    "actionsByCommunity is defined for community filter",
    !!statsForA.actionsByCommunity && statsForA.actionsByCommunity.length > 0,
  );

  if (statsForA.actionsByCommunity) {
    const bucketA = statsForA.actionsByCommunity.find(
      (b) => b.communityId === communityA.id,
    );

    TestValidator.predicate(
      "actionsByCommunity contains bucket for community A",
      !!bucketA,
    );

    if (bucketA) {
      TestValidator.equals(
        "community bucket count matches totalActions for A",
        bucketA.count,
        statsForA.totalActions,
      );
    }

    const hasBucketForB = statsForA.actionsByCommunity.some(
      (b) => b.communityId === communityB.id,
    );

    TestValidator.predicate(
      "actionsByCommunity does not contain bucket for community B when filtering A",
      hasBucketForB === false,
    );
  }

  // Validate timeSeries
  TestValidator.predicate(
    "timeSeries is defined and non-empty",
    !!statsForA.timeSeries && statsForA.timeSeries.length > 0,
  );

  if (statsForA.timeSeries) {
    let totalBucketCount = 0;
    for (const bucket of statsForA.timeSeries) {
      const bucketStart = new Date(bucket.start);
      const bucketEnd = new Date(bucket.end);
      totalBucketCount += bucket.count;

      TestValidator.predicate(
        "time bucket start is not before from",
        bucketStart.getTime() >= fromDate.getTime() ||
          bucketEnd.getTime() >= fromDate.getTime(),
      );

      TestValidator.predicate(
        "time bucket end is not after to",
        bucketEnd.getTime() <= toDate.getTime() ||
          bucketStart.getTime() <= toDate.getTime(),
      );
    }

    TestValidator.equals(
      "sum of timeSeries bucket counts equals totalActions",
      totalBucketCount,
      statsForA.totalActions,
    );
  }

  // Validate actionsByType for community A
  TestValidator.predicate(
    "actionsByType is defined",
    !!statsForA.actionsByType && statsForA.actionsByType.length > 0,
  );

  if (statsForA.actionsByType) {
    const expectedCountsByType = new Map<string, number>();
    for (const action of actionsForA) {
      const prev = expectedCountsByType.get(action.action_type) ?? 0;
      expectedCountsByType.set(action.action_type, prev + 1);
    }

    const sumCountsFromBuckets = statsForA.actionsByType.reduce(
      (acc, bucket) => acc + bucket.count,
      0,
    );

    TestValidator.equals(
      "sum of actionsByType counts equals totalActions",
      sumCountsFromBuckets,
      statsForA.totalActions,
    );

    for (const [actionType, expected] of expectedCountsByType.entries()) {
      const bucket = statsForA.actionsByType.find(
        (b) => b.actionType === actionType,
      );

      TestValidator.predicate(
        `actionsByType bucket exists for actionType ${actionType}`,
        !!bucket,
      );

      if (bucket) {
        TestValidator.equals(
          `actionsByType count matches expected for ${actionType}`,
          bucket.count,
          expected,
        );
      }
    }
  }

  // 8. Follow-up: request statistics only for community B.
  const statsRequestForB = {
    from: fromStr,
    to: toStr,
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: undefined,
    communityIds: [communityB.id],
    userIds: undefined,
    groupBy: ["community", "actionType"],
    timeGranularity: undefined,
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const statsForB: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.communityModerator.statistics.moderationActions.index(
      connection,
      { body: statsRequestForB },
    );
  typia.assert(statsForB);

  const expectedCountB = actionsForB.length;

  TestValidator.equals(
    "totalActions reflects number of actions for community B only",
    statsForB.totalActions,
    expectedCountB,
  );

  if (statsForB.actionsByCommunity) {
    const bucketB = statsForB.actionsByCommunity.find(
      (b) => b.communityId === communityB.id,
    );

    TestValidator.predicate(
      "actionsByCommunity contains bucket for community B",
      !!bucketB,
    );

    if (bucketB) {
      TestValidator.equals(
        "community B bucket count matches totalActions",
        bucketB.count,
        statsForB.totalActions,
      );
    }

    const hasBucketForA = statsForB.actionsByCommunity.some(
      (b) => b.communityId === communityA.id,
    );

    TestValidator.predicate(
      "actionsByCommunity does not contain bucket for community A when filtering B",
      hasBucketForA === false,
    );
  }
}
