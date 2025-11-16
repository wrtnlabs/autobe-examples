import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionStatistics";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Compare moderation action statistics grouped by actor type.
 *
 * This test validates that the moderation action statistics endpoint can
 * distinguish and aggregate actions performed by different actor types
 * (platform administrators vs community moderators) and expose those
 * aggregations via the `actionsByActorType` buckets.
 *
 * High-level flow:
 *
 * 1. Register a platform admin and obtain an authenticated admin context.
 * 2. Register a community moderator and obtain an authenticated moderator context.
 * 3. Register a member user and create a report as that member (to simulate real
 *    moderation context).
 * 4. While authenticated as platform admin, create at least one moderation action.
 * 5. While authenticated as community moderator, create at least one moderation
 *    action.
 * 6. Switch back to platform admin and call the statistics endpoint with a time
 *    range that covers all created actions and groupBy ["actorType"].
 * 7. Assert that `actionsByActorType` exists and contains at least two buckets,
 *    each with count >= 1 and different `actorType` values.
 * 8. Assert that `totalActions` equals the sum of the bucket counts.
 */
export async function test_api_moderation_action_statistics_by_actor_type_comparison(
  connection: api.IConnection,
) {
  // Helper to generate common href/referrer URLs
  const href: string & tags.Format<"uri"> =
    "https://example.com/join" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://example.com/" as string & tags.Format<"uri">;

  // 1. Register a platform admin (this also authenticates as admin)
  const adminEmail: string & tags.Format<"email"> = ("admin_" +
    RandomGenerator.alphaNumeric(8) +
    "@example.com") as string & tags.Format<"email">;
  const adminPassword = "P@ssw0rd!";

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(), // any string is ok here
    href,
    referrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Register a community moderator (this authenticates as moderator)
  const moderatorEmail: string & tags.Format<"email"> = ("mod_" +
    RandomGenerator.alphaNumeric(8) +
    "@example.com") as string & tags.Format<"email">;
  const moderatorPassword = "P@ssw0rd!";

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 3. Register a member user and create a report as that member
  const memberEmail: string & tags.Format<"email"> = ("member_" +
    RandomGenerator.alphaNumeric(8) +
    "@example.com") as string & tags.Format<"email">;
  const memberPassword = "P@ssw0rd!";

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // At this point, connection is authenticated as member user because
  // /auth/memberUser/join sets Authorization header.

  const reportCreateBody = {
    reporter_type: "member",
    // We do not know real categories or communities, so let backend
    // accept random UUIDs / null as appropriate.
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
  typia.assert<ICommunityPlatformReport>(report);

  // Capture timestamps around moderation action creation
  const fromDate = new Date();

  // 4. Switch back to platform admin and create an admin-scoped moderation action
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminLoginAuthorized,
  );

  const adminActionBody = {
    community_id: report.context_community?.id ?? null,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Violation of community rules by reported post",
    notes_internal: "Removed content after admin review.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const adminAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: adminActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(adminAction);

  // 5. Switch to community moderator and create a moderator-scoped moderation action
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLoginAuthorized,
  );

  const moderatorActionBody = {
    community_id: report.context_community?.id ?? null,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Warned user based on member report.",
    notes_internal: "First-time offense; issued warning only.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderatorAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: moderatorActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderatorAction);

  const toDate = new Date();

  // 6. Switch back to platform admin to call statistics endpoint
  const adminLoginForStatsBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminForStats: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginForStatsBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminForStats);

  const statisticsRequestBody = {
    from: new Date(fromDate.getTime() - 5 * 60 * 1000).toISOString(),
    to: new Date(toDate.getTime() + 5 * 60 * 1000).toISOString(),
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: undefined,
    communityIds: undefined,
    userIds: undefined,
    groupBy: ["actorType"],
    timeGranularity: undefined,
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const stats: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.moderationActions.index(
      connection,
      {
        body: statisticsRequestBody,
      },
    );
  typia.assert<ICommunityPlatformModerationActionStatistics>(stats);

  // 7. Validate stats.actionsByActorType has at least two buckets with distinct types
  const buckets = stats.actionsByActorType ?? [];

  TestValidator.predicate(
    "statistics.actionsByActorType should contain at least two buckets",
    buckets.length >= 2,
  );

  const distinctActorTypes = Array.from(
    new Set(buckets.map((b) => b.actorType)),
  );

  TestValidator.predicate(
    "statistics.actionsByActorType should have at least two distinct actorType values",
    distinctActorTypes.length >= 2,
  );

  const adminBucket = buckets.find((b) => b.count >= 1);
  TestValidator.predicate(
    "there should be at least one actorType bucket with count >= 1",
    adminBucket !== undefined,
  );

  const secondBucket = buckets.find((b) => b !== adminBucket && b.count >= 1);
  TestValidator.predicate(
    "there should be a second actorType bucket with count >= 1",
    secondBucket !== undefined,
  );

  // 8. Validate totalActions equals sum of bucket counts
  const sumCounts = buckets.reduce((acc, b) => acc + b.count, 0);

  TestValidator.equals(
    "totalActions should equal sum of actionsByActorType counts",
    stats.totalActions,
    sumCounts,
  );
}
