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

export async function test_api_moderation_case_statistics_basic_metrics(
  connection: api.IConnection,
) {
  // 1. AdminUser joins (registration) and becomes authenticated.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case as the admin.
  const caseKey: string = `case-${RandomGenerator.alphaNumeric(12)}`;
  const moderationCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "urgent",
    ] as const),
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create a moderation action tied to the case, as admin.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
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

  // 4. MemberUser joins and becomes authenticated.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. As the member user, create multiple appeals (at least two) for the same moderation action.
  const appeals: ICommunityPlatformAppeal[] = [];

  const firstAppealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformAppeal.ICreate;
  const firstAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: firstAppealBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(firstAppeal);
  appeals.push(firstAppeal);

  const secondAppealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;
  const secondAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: secondAppealBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(secondAppeal);
  appeals.push(secondAppeal);

  // Optionally, create a third appeal to have more data points.
  const thirdAppealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformAppeal.ICreate;
  const thirdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: thirdAppealBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(thirdAppeal);
  appeals.push(thirdAppeal);

  const createdAppealsCount: number = appeals.length;
  TestValidator.predicate(
    "created at least two appeals for moderation action",
    createdAppealsCount >= 2,
  );

  // 6. Switch back to the adminUser by logging in again.
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReAuth: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminReAuth);

  // 7. Fetch statistics for the moderation case using caseKey.
  const statistics: ICommunityPlatformModerationCaseStatistics =
    await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
      connection,
      {
        caseKey,
      },
    );
  typia.assert<ICommunityPlatformModerationCaseStatistics>(statistics);

  // 8. Core counter validations.
  TestValidator.equals(
    "caseKey in statistics matches created case",
    statistics.caseKey,
    caseKey,
  );

  TestValidator.equals(
    "totalAppeals equals number of created appeals",
    statistics.totalAppeals,
    createdAppealsCount,
  );

  TestValidator.predicate(
    "pendingAppeals is within [0, totalAppeals]",
    statistics.pendingAppeals >= 0 &&
      statistics.pendingAppeals <= statistics.totalAppeals,
  );

  TestValidator.predicate(
    "approvedAppeals is non-negative",
    statistics.approvedAppeals >= 0,
  );

  TestValidator.predicate(
    "rejectedAppeals is non-negative",
    statistics.rejectedAppeals >= 0,
  );

  const sumBuckets =
    statistics.pendingAppeals +
    statistics.approvedAppeals +
    statistics.rejectedAppeals;

  TestValidator.predicate(
    "sum of per-status appeal buckets does not exceed totalAppeals",
    sumBuckets <= statistics.totalAppeals,
  );

  // 9. Temporal metrics: firstAppealAt and latestAppealAt.
  TestValidator.predicate(
    "firstAppealAt is not null when appeals exist",
    statistics.firstAppealAt !== null && statistics.firstAppealAt !== undefined,
  );

  TestValidator.predicate(
    "latestAppealAt is not null when appeals exist",
    statistics.latestAppealAt !== null &&
      statistics.latestAppealAt !== undefined,
  );

  if (
    statistics.firstAppealAt !== null &&
    statistics.firstAppealAt !== undefined &&
    statistics.latestAppealAt !== null &&
    statistics.latestAppealAt !== undefined
  ) {
    const firstTime = new Date(statistics.firstAppealAt).getTime();
    const latestTime = new Date(statistics.latestAppealAt).getTime();

    TestValidator.predicate(
      "firstAppealAt is not after latestAppealAt",
      firstTime <= latestTime,
    );
  }

  // 10. openAppealsOlderThanThresholdCount basic invariants.
  TestValidator.predicate(
    "openAppealsOlderThanThresholdCount is within [0, totalAppeals]",
    statistics.openAppealsOlderThanThresholdCount >= 0 &&
      statistics.openAppealsOlderThanThresholdCount <= statistics.totalAppeals,
  );

  TestValidator.predicate(
    "openAppealsOlderThanThresholdCount is within [0, pendingAppeals]",
    statistics.openAppealsOlderThanThresholdCount >= 0 &&
      statistics.openAppealsOlderThanThresholdCount <=
        statistics.pendingAppeals,
  );
}
