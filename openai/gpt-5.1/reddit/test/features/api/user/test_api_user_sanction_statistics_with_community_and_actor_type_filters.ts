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
import type { ICommunityPlatformUserSanctionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatistics";
import type { ICommunityPlatformUserSanctionStatisticsByActorTypeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByActorTypeBucket";
import type { ICommunityPlatformUserSanctionStatisticsByCommunityBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByCommunityBucket";
import type { ICommunityPlatformUserSanctionStatisticsByTypeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsByTypeBucket";
import type { ICommunityPlatformUserSanctionStatisticsTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanctionStatisticsTimeBucket";

export async function test_api_user_sanction_statistics_with_community_and_actor_type_filters(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.console.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create a visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible",
    description: "Publicly visible community for testing statistics",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (join directly authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.local/join",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  const sanctionedMemberId: string & tags.Format<"uuid"> = memberAuth.id;

  // 4. As memberUser, create two distinct communities A and B
  const communityABody = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community A for sanction statistics",
    description: "Test community A",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community B for sanction statistics",
    description: "Test community B",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 5. As memberUser, create at least one report per community
  const reportAInput = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: communityA.id,
    severity: "medium",
    description: "Report in community A for sanction statistics test",
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportAInput },
    );
  typia.assert(reportA);

  const reportBInput = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: communityB.id,
    severity: "medium",
    description: "Report in community B for sanction statistics test",
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportBInput },
    );
  typia.assert(reportB);

  // 6. Switch back to platformAdmin for creating sanctions
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // Define a shared time window for sanctions
  const now = new Date();
  const baseFrom = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const baseUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes after

  const effectiveFromIso = baseFrom.toISOString();
  const effectiveUntilIso = baseUntil.toISOString();

  const sanctionsForCommunityA: ICommunityPlatformUserSanction[] = [];
  const sanctionsForCommunityB: ICommunityPlatformUserSanction[] = [];
  const platformWideSanctions: ICommunityPlatformUserSanction[] = [];

  // Helper to create a sanction
  const createSanction = async (
    reportId: string & tags.Format<"uuid">,
    communityId: string | null,
    sanctionType: string,
  ): Promise<ICommunityPlatformUserSanction> => {
    const body = {
      community_platform_report_id: reportId,
      sanctioned_memberuser_id: sanctionedMemberId,
      community_id: communityId,
      sanction_type: sanctionType,
      status: "active",
      effective_from: effectiveFromIso,
      effective_until: effectiveUntilIso,
      reason_summary: "Automated test sanction",
      notes_internal: "E2E sanction statistics test",
    } satisfies ICommunityPlatformUserSanction.ICreate;

    const sanction =
      await api.functional.communityPlatform.platformAdmin.userSanctions.create(
        connection,
        { body },
      );
    typia.assert(sanction);
    return sanction;
  };

  // Create 3 sanctions for community A
  sanctionsForCommunityA.push(
    await createSanction(reportA.id, communityA.id, "temporary_community_ban"),
  );
  sanctionsForCommunityA.push(
    await createSanction(reportA.id, communityA.id, "temporary_community_ban"),
  );
  sanctionsForCommunityA.push(
    await createSanction(reportA.id, communityA.id, "warning"),
  );

  // Create 2 sanctions for community B
  sanctionsForCommunityB.push(
    await createSanction(reportB.id, communityB.id, "temporary_community_ban"),
  );
  sanctionsForCommunityB.push(
    await createSanction(reportB.id, communityB.id, "warning"),
  );

  // Optional platform-wide sanction (community_id null)
  platformWideSanctions.push(
    await createSanction(reportA.id, null, "temporary_platform_ban"),
  );

  const totalA = sanctionsForCommunityA.length;
  const totalB = sanctionsForCommunityB.length;

  // 7. Build statistics request for community A only, actorTypes ["platformAdmin"]
  const statsRequestForA = {
    from: new Date(baseFrom.getTime() - 60 * 1000).toISOString(),
    to: new Date(baseUntil.getTime() + 60 * 1000).toISOString(),
    sanctionTypes: undefined,
    severityLevels: undefined,
    communityIds: [communityA.id],
    actorTypes: ["platformAdmin"],
    userIds: undefined,
    groupBy: ["community", "actorType", "type", "time"],
    timeGranularity: "minute",
  } satisfies ICommunityPlatformUserSanctionStatistics.IRequest;

  const statsForA: ICommunityPlatformUserSanctionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.userSanctions.index(
      connection,
      { body: statsRequestForA },
    );
  typia.assert(statsForA);

  // 8. Assertions for community A filtered statistics
  TestValidator.equals(
    "total sanctions for community A should match created count",
    statsForA.totalSanctions,
    totalA,
  );

  // sanctionsByCommunity must contain only community A with count == totalA
  if (statsForA.sanctionsByCommunity !== undefined) {
    const communityBuckets = statsForA.sanctionsByCommunity;

    const bucketA = communityBuckets.find(
      (b: ICommunityPlatformUserSanctionStatisticsByCommunityBucket) =>
        b.communityId === communityA.id,
    );

    TestValidator.predicate(
      "sanctionsByCommunity must have bucket for community A",
      !!bucketA,
    );

    if (bucketA) {
      TestValidator.equals(
        "community A bucket count should equal totalA",
        bucketA.count,
        totalA,
      );
    }

    const bucketForB = communityBuckets.find(
      (b: ICommunityPlatformUserSanctionStatisticsByCommunityBucket) =>
        b.communityId === communityB.id,
    );

    TestValidator.predicate(
      "sanctionsByCommunity must not include community B when filtering by A",
      !bucketForB,
    );
  }

  // sanctionsByActorType should have platformAdmin bucket with count == totalA
  if (statsForA.sanctionsByActorType !== undefined) {
    const actorBuckets = statsForA.sanctionsByActorType;
    const platformAdminBucket = actorBuckets.find(
      (b: ICommunityPlatformUserSanctionStatisticsByActorTypeBucket) =>
        b.actorType === "platformAdmin",
    );

    TestValidator.predicate(
      "sanctionsByActorType must have platformAdmin bucket",
      !!platformAdminBucket,
    );

    if (platformAdminBucket) {
      TestValidator.equals(
        "platformAdmin bucket count should equal totalA",
        platformAdminBucket.count,
        totalA,
      );
    }
  }

  // sanctionsByType buckets should only reflect community A sanctions; sum counts == totalA
  if (statsForA.sanctionsByType !== undefined) {
    const typeBuckets = statsForA.sanctionsByType;
    const sumTypeCounts = typeBuckets.reduce(
      (acc: number, b: ICommunityPlatformUserSanctionStatisticsByTypeBucket) =>
        acc + b.count,
      0,
    );

    TestValidator.equals(
      "sum of sanctionsByType counts must equal totalA",
      sumTypeCounts,
      totalA,
    );
  }

  // timeSeries sum must equal totalA
  if (statsForA.timeSeries !== undefined) {
    const timeBuckets = statsForA.timeSeries;
    const sumTimeCounts = timeBuckets.reduce(
      (
        acc: number,
        bucket: ICommunityPlatformUserSanctionStatisticsTimeBucket,
      ) => acc + bucket.count,
      0,
    );

    TestValidator.equals(
      "sum of timeSeries counts must equal totalA",
      sumTimeCounts,
      totalA,
    );
  }

  // 9. Second query: filter by community B to validate pivot behavior
  const statsRequestForB = {
    from: statsRequestForA.from,
    to: statsRequestForA.to,
    sanctionTypes: undefined,
    severityLevels: undefined,
    communityIds: [communityB.id],
    actorTypes: ["platformAdmin"],
    userIds: undefined,
    groupBy: ["community", "actorType", "type", "time"],
    timeGranularity: "minute",
  } satisfies ICommunityPlatformUserSanctionStatistics.IRequest;

  const statsForB: ICommunityPlatformUserSanctionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.userSanctions.index(
      connection,
      { body: statsRequestForB },
    );
  typia.assert(statsForB);

  TestValidator.equals(
    "total sanctions for community B should match created count",
    statsForB.totalSanctions,
    totalB,
  );

  if (statsForB.sanctionsByCommunity !== undefined) {
    const communityBucketsB = statsForB.sanctionsByCommunity;

    const bucketB = communityBucketsB.find(
      (b: ICommunityPlatformUserSanctionStatisticsByCommunityBucket) =>
        b.communityId === communityB.id,
    );

    TestValidator.predicate(
      "sanctionsByCommunity must have bucket for community B",
      !!bucketB,
    );

    if (bucketB) {
      TestValidator.equals(
        "community B bucket count should equal totalB",
        bucketB.count,
        totalB,
      );
    }

    const bucketForAInBStats = communityBucketsB.find(
      (b: ICommunityPlatformUserSanctionStatisticsByCommunityBucket) =>
        b.communityId === communityA.id,
    );

    TestValidator.predicate(
      "sanctionsByCommunity in B stats must not include community A",
      !bucketForAInBStats,
    );
  }

  if (statsForB.sanctionsByActorType !== undefined) {
    const actorBucketsB = statsForB.sanctionsByActorType;
    const platformAdminBucketB = actorBucketsB.find(
      (b: ICommunityPlatformUserSanctionStatisticsByActorTypeBucket) =>
        b.actorType === "platformAdmin",
    );

    TestValidator.predicate(
      "sanctionsByActorType for B must have platformAdmin bucket",
      !!platformAdminBucketB,
    );

    if (platformAdminBucketB) {
      TestValidator.equals(
        "platformAdmin bucket count for B should equal totalB",
        platformAdminBucketB.count,
        totalB,
      );
    }
  }

  if (statsForB.sanctionsByType !== undefined) {
    const typeBucketsB = statsForB.sanctionsByType;
    const sumTypeCountsB = typeBucketsB.reduce(
      (acc: number, b: ICommunityPlatformUserSanctionStatisticsByTypeBucket) =>
        acc + b.count,
      0,
    );

    TestValidator.equals(
      "sum of sanctionsByType counts for B must equal totalB",
      sumTypeCountsB,
      totalB,
    );
  }

  if (statsForB.timeSeries !== undefined) {
    const timeBucketsB = statsForB.timeSeries;
    const sumTimeCountsB = timeBucketsB.reduce(
      (
        acc: number,
        bucket: ICommunityPlatformUserSanctionStatisticsTimeBucket,
      ) => acc + bucket.count,
      0,
    );

    TestValidator.equals(
      "sum of timeSeries counts for B must equal totalB",
      sumTimeCountsB,
      totalB,
    );
  }
}
