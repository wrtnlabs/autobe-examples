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
 * Verify that moderation case statistics are only accessible to adminUser
 * actors and that both unauthenticated and memberUser callers are rejected.
 *
 * Business flow covered:
 *
 * 1. Admin joins (registration implicitly authenticates) and becomes current
 *    actor.
 * 2. Admin creates a moderation case with a known case_key.
 * 3. Admin records a moderation action under that case.
 * 4. Member user joins and files an appeal against that moderation action.
 * 5. Admin fetches statistics for the case and sees non-trivial appeal counts.
 * 6. An unauthenticated connection cannot access the statistics endpoint.
 * 7. An authenticated memberUser also cannot access the statistics endpoint.
 */
export async function test_api_moderation_case_statistics_admin_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated adminUser actor
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a moderation case with deterministic case_key
  const caseKeyBase: string = RandomGenerator.alphaNumeric(12);
  const caseKey: string = `case-${caseKeyBase}`;

  const moderationCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  TestValidator.equals(
    "created moderation case uses requested case key",
    moderationCase.case_key,
    caseKey,
  );

  // 3. Admin records a moderation action under that case
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
  typia.assert(moderationAction);

  // 4. Member user joins and files an appeal against the moderation action
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPass123",
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const appealBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealBody,
      },
    );
  typia.assert(appeal);

  // 5. Switch back to admin actor explicitly using login (idempotent but clear)
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: "AdminPass123!",
    ip: null,
    href: "https://community.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/admin" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 6. As adminUser, call statistics endpoint and verify response
  const statistics: ICommunityPlatformModerationCaseStatistics =
    await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
      connection,
      {
        caseKey,
      },
    );
  typia.assert(statistics);

  TestValidator.equals(
    "statistics caseKey matches requested caseKey",
    statistics.caseKey,
    caseKey,
  );

  TestValidator.predicate(
    "statistics totalAppeals is at least 1 after creating an appeal",
    statistics.totalAppeals >= 1,
  );

  // 7. Build an unauthenticated connection and ensure access is denied
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated caller cannot access moderation case statistics",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
        unauthenticatedConnection,
        {
          caseKey,
        },
      );
    },
  );

  // 8. Authenticate as memberUser and ensure access is denied for non-admin
  const memberLoginBody = {
    identifier: memberAuthorized.username,
    password: "MemberPass123",
    ip: null,
    href: "https://community.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAfterLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  await TestValidator.httpError(
    "memberUser actor cannot access admin-only moderation case statistics",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
        connection,
        {
          caseKey,
        },
      );
    },
  );
}
