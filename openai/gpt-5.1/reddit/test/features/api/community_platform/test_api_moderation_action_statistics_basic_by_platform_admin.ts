import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionStatistics";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_statistics_basic_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register and authenticate a member user who will submit a report.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 3. Create a moderation report as the member user.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 4. Switch authentication context back to platform admin by logging in.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 5. Create a moderation action as the platform admin.
  const actionType = "remove_content";
  const targetScope = "post";

  const moderationActionCreateBody = {
    community_id: null,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Build a time window that definitely includes the new action.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneDayMs);
  const toDate = new Date(now.getTime() + oneDayMs);

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 7. Call the statistics endpoint with groupBy on actionType, actorType, and time.
  const statsRequestBody = {
    from: fromIso,
    to: toIso,
    actorTypes: [],
    targetEntityTypes: [],
    actionTypes: [],
    communityIds: [],
    userIds: [],
    groupBy: ["actionType", "actorType", "time"],
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const stats: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.moderationActions.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert(stats);

  // 8. Validate that the statistics reflect the created moderation action.

  // 8.1 totalActions >= 1
  TestValidator.predicate(
    "totalActions should be at least 1 after creating a moderation action",
    stats.totalActions >= 1,
  );

  // 8.2 actionsByType should include a bucket for our actionType with count >= 1, if present.
  if (stats.actionsByType !== undefined) {
    const matchingTypeBucket = stats.actionsByType.find(
      (bucket) => bucket.actionType === actionType,
    );

    TestValidator.predicate(
      "actionsByType should contain a bucket for the created actionType",
      matchingTypeBucket !== undefined,
    );

    if (matchingTypeBucket !== undefined) {
      TestValidator.predicate(
        "matching actionType bucket should have count >= 1",
        matchingTypeBucket.count >= 1,
      );
    }
  }

  // 8.3 actionsByActorType: ensure at least one bucket with count >= 1 if present.
  if (stats.actionsByActorType !== undefined) {
    const anyActorBucketWithCount = stats.actionsByActorType.find(
      (bucket) => bucket.count >= 1,
    );

    TestValidator.predicate(
      "actionsByActorType should contain at least one bucket with count >= 1",
      anyActorBucketWithCount !== undefined,
    );

    if (anyActorBucketWithCount !== undefined) {
      TestValidator.predicate(
        "actorType bucket used should have non-empty actorType label",
        anyActorBucketWithCount.actorType.length > 0,
      );
    }
  }

  // 8.4 timeSeries: if present, ensure at least one bucket with count >= 1 and start < end.
  if (stats.timeSeries !== undefined && stats.timeSeries.length > 0) {
    const anyBucketWithCount = stats.timeSeries.find(
      (bucket) => bucket.count >= 1,
    );

    TestValidator.predicate(
      "timeSeries should contain at least one bucket with count >= 1",
      anyBucketWithCount !== undefined,
    );

    const firstBucket = stats.timeSeries[0];
    TestValidator.predicate(
      "first timeSeries bucket should have start < end (lexicographically as ISO strings)",
      firstBucket.start < firstBucket.end,
    );
  }
}
