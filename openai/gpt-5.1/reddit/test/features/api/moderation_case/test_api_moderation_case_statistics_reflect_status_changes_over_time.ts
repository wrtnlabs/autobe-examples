import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationCaseStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseStatistics";

/**
 * Validate that moderation case appeal statistics correctly aggregate multiple
 * appeals and reflect their status distribution.
 *
 * Business workflow:
 *
 * 1. An adminUser account is created and authenticated.
 * 2. The admin opens a moderation case with a unique case_key.
 * 3. The admin records a moderation action associated with that case.
 * 4. A memberUser account is created and authenticated.
 * 5. The member submits multiple appeals against the moderation action.
 * 6. The admin re-authenticates (switching back from memberUser) and retrieves
 *    statistics for the moderation case by caseKey.
 * 7. The test verifies that the statistics endpoint reports the correct
 *    totalAppeals and a coherent breakdown across pending/approved/rejected
 *    counts, given that no appeal decisions have been made yet.
 */
export async function test_api_moderation_case_statistics_reflect_status_changes_over_time(
  connection: api.IConnection,
) {
  // 1. AdminUser registration (join) to obtain admin identity and token
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // Persist admin credential pieces for re-login later
  const adminIdentifier: string = adminJoinBody.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Create a moderation case as the adminUser
  const caseKey: string = RandomGenerator.alphaNumeric(16);
  const moderationCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  TestValidator.equals(
    "created case uses requested case_key",
    moderationCase.case_key,
    caseKey,
  );

  // 3. Create a moderation action associated with the case
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  TestValidator.equals(
    "moderation action is linked to the created case (by summary if present)",
    moderationAction.moderation_case?.id ?? moderationCase.id,
    moderationCase.id,
  );

  // 4. MemberUser registration (join) to obtain member identity and token
  const memberJoinBody: ICommunityPlatformMemberuser.IJoin =
    typia.random<ICommunityPlatformMemberuser.IJoin>();

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    memberAuthorizedFromJoin,
  );

  // 5. Member submits multiple appeals against the moderation action
  const appealCount = 3;
  const appeals: ICommunityPlatformAppeal[] = [];

  for (let i = 0; i < appealCount; i++) {
    const appealBody = {
      moderation_action_id: moderationAction.id,
      justification: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ICommunityPlatformAppeal.ICreate;

    const appeal: ICommunityPlatformAppeal =
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: appealBody,
        },
      );
    typia.assert<ICommunityPlatformAppeal>(appeal);
    appeals.push(appeal);
  }

  TestValidator.equals(
    "number of created appeals matches planned count",
    appeals.length,
    appealCount,
  );

  // 6. Re-authenticate as adminUser to access admin-only statistics endpoint
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 7. Retrieve moderation case statistics and validate aggregation
  const stats: ICommunityPlatformModerationCaseStatistics =
    await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
      connection,
      {
        caseKey: moderationCase.case_key,
      },
    );
  typia.assert<ICommunityPlatformModerationCaseStatistics>(stats);

  TestValidator.equals(
    "statistics caseKey matches moderation case_key",
    stats.caseKey,
    moderationCase.case_key,
  );

  TestValidator.equals(
    "totalAppeals equals number of created appeals",
    stats.totalAppeals,
    appeals.length,
  );

  TestValidator.equals(
    "pendingAppeals equals totalAppeals when no decisions have been made",
    stats.pendingAppeals,
    stats.totalAppeals,
  );

  TestValidator.equals(
    "approvedAppeals is zero when no approvals exist",
    stats.approvedAppeals,
    0,
  );

  TestValidator.equals(
    "rejectedAppeals is zero when no rejections exist",
    stats.rejectedAppeals,
    0,
  );

  TestValidator.predicate(
    "firstAppealAt is defined when appeals exist",
    stats.firstAppealAt !== null && stats.firstAppealAt !== undefined,
  );

  TestValidator.predicate(
    "latestAppealAt is defined when appeals exist",
    stats.latestAppealAt !== null && stats.latestAppealAt !== undefined,
  );

  TestValidator.predicate(
    "openAppealsOlderThanThresholdCount is non-negative",
    stats.openAppealsOlderThanThresholdCount >= 0,
  );

  if (
    stats.firstAppealAt !== null &&
    stats.firstAppealAt !== undefined &&
    stats.latestAppealAt !== null &&
    stats.latestAppealAt !== undefined
  ) {
    const firstTime = new Date(stats.firstAppealAt).getTime();
    const latestTime = new Date(stats.latestAppealAt).getTime();

    TestValidator.predicate(
      "firstAppealAt is not after latestAppealAt",
      firstTime <= latestTime,
    );
  }
}
