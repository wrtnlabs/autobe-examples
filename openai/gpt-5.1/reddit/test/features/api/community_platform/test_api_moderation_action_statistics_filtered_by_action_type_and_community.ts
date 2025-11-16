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

export async function test_api_moderation_action_statistics_filtered_by_action_type_and_community(
  connection: api.IConnection,
) {
  // 1. Prepare two separate connection objects: one for memberUser, one for platformAdmin.
  //    We must not touch connection.headers after creation, so we clone once per actor.
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const adminConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Join a member user (self-registration) so we have an authenticated memberUser actor.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join/member",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberConnection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. Join a platform administrator so we have an authenticated platformAdmin actor.
  const adminEmail =
    `admin+${RandomGenerator.alphaNumeric(8)}@example.com` as string;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://app.example.com/join/admin",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 4. Log in again as memberUser on memberConnection (not strictly necessary after join,
  //    but ensures login flow works and consolidates the pattern used in the project).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login/member",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(memberConnection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 5. Log in again as platformAdmin on adminConnection to establish a clean admin session
  //    that will be used for moderation actions and statistics.
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/login/admin",
    referrer: "https://app.example.com/admin",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(adminConnection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminLoginAuthorized,
  );

  // 6. Create a couple of reports as the member user. These are not directly linked to
  //    moderation actions by ID in our DTOs, but they simulate real-world usage.
  const reportReasonCategoryId1 = typia.random<string & tags.Format<"uuid">>();
  const reportReasonCategoryId2 = typia.random<string & tags.Format<"uuid">>();

  const reportBodies: ICommunityPlatformReport.ICreate[] = [
    {
      reporter_type: "member",
      report_reason_category_id: reportReasonCategoryId1,
      community_id: null,
      severity: "low",
      description: RandomGenerator.paragraph({ sentences: 3 }),
    },
    {
      reporter_type: "member",
      report_reason_category_id: reportReasonCategoryId2,
      community_id: null,
      severity: "high",
      description: RandomGenerator.paragraph({ sentences: 4 }),
    },
  ];

  const createdReports: ICommunityPlatformReport[] = [];
  for (const body of reportBodies) {
    const created =
      await api.functional.communityPlatform.memberUser.reports.create(
        memberConnection,
        { body },
      );
    typia.assert<ICommunityPlatformReport>(created);
    createdReports.push(created);
  }

  // 7. Prepare two synthetic community IDs to simulate C1 and C2.
  const communityIdC1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const communityIdC2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 8. Create moderation actions as platformAdmin, some for C1 with action_type "ban_user",
  //    others for C2 with action_type "remove_content".
  type CreateInput = ICommunityPlatformModerationAction.ICreate;

  const banActionsForC1Count = 3;
  const removeActionsForC2Count = 2;

  const moderationBodies: CreateInput[] = [
    // Ban actions in community C1
    ...ArrayUtil.repeat(
      banActionsForC1Count,
      (index) =>
        ({
          community_id: communityIdC1,
          action_type: "ban_user",
          target_scope: "user",
          reason_summary: `ban_user action #${index + 1} in C1`,
          notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
        }) satisfies ICommunityPlatformModerationAction.ICreate,
    ),

    // Remove-content actions in community C2
    ...ArrayUtil.repeat(
      removeActionsForC2Count,
      (index) =>
        ({
          community_id: communityIdC2,
          action_type: "remove_content",
          target_scope: "post",
          reason_summary: `remove_content action #${index + 1} in C2`,
          notes_internal: RandomGenerator.paragraph({ sentences: 2 }),
        }) satisfies ICommunityPlatformModerationAction.ICreate,
    ),
  ];

  const createdActions: ICommunityPlatformModerationAction[] = [];
  for (const body of moderationBodies) {
    const created =
      await api.functional.communityPlatform.platformAdmin.moderationActions.create(
        adminConnection,
        { body },
      );
    typia.assert<ICommunityPlatformModerationAction>(created);
    createdActions.push(created);
  }

  // 9. Build the statistics request. We create a from/to window around now.
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const from = fromDate.toISOString() as string & tags.Format<"date-time">;
  const to = now.toISOString() as string & tags.Format<"date-time">;

  const statsRequestBody = {
    from,
    to,
    actorTypes: undefined,
    targetEntityTypes: undefined,
    actionTypes: ["ban_user"],
    communityIds: [communityIdC1],
    userIds: undefined,
    groupBy: ["actionType", "community"],
    timeGranularity: undefined,
  } satisfies ICommunityPlatformModerationActionStatistics.IRequest;

  const stats: ICommunityPlatformModerationActionStatistics =
    await api.functional.communityPlatform.platformAdmin.statistics.moderationActions.index(
      adminConnection,
      { body: statsRequestBody },
    );
  typia.assert<ICommunityPlatformModerationActionStatistics>(stats);

  // 10. Compute expected totals: actions with action_type === "ban_user" and community_id === C1.
  const expectedTotal = createdActions.filter(
    (action) =>
      action.action_type === "ban_user" &&
      action.community_id === communityIdC1,
  ).length;

  // 11. Validate totalActions.
  TestValidator.equals(
    "totalActions should equal number of ban_user actions in community C1",
    Number(stats.totalActions),
    expectedTotal,
  );

  // 12. Validate actionsByType bucket for "ban_user".
  if (stats.actionsByType !== undefined) {
    const banBucket = stats.actionsByType.find(
      (bucket) => bucket.actionType === "ban_user",
    );

    TestValidator.predicate(
      "actionsByType should contain a bucket for ban_user when filtered by actionTypes [ban_user]",
      !!banBucket,
    );

    if (banBucket !== undefined) {
      TestValidator.equals(
        "ban_user bucket count should match expectedTotal",
        Number(banBucket.count),
        expectedTotal,
      );
    }
  }

  // 13. Validate actionsByCommunity bucket for C1 and absence (or zero) for C2.
  if (stats.actionsByCommunity !== undefined) {
    const bucketC1 = stats.actionsByCommunity.find(
      (bucket) => bucket.communityId === communityIdC1,
    );

    TestValidator.predicate(
      "actionsByCommunity should contain a bucket for community C1 when filtered by that communityId",
      !!bucketC1,
    );

    if (bucketC1 !== undefined) {
      TestValidator.equals(
        "community C1 bucket count should match expectedTotal",
        Number(bucketC1.count),
        expectedTotal,
      );
    }

    const bucketC2 = stats.actionsByCommunity.find(
      (bucket) => bucket.communityId === communityIdC2,
    );

    if (bucketC2 !== undefined) {
      TestValidator.equals(
        "community C2 bucket count should be zero when filtered exclusively by communityId C1",
        Number(bucketC2.count),
        0,
      );
    }
  }
}
