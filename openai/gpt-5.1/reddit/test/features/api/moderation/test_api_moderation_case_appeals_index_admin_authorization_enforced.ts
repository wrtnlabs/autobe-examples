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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

/**
 * Ensure role-based authorization for listing appeals of a moderation case.
 *
 * Business goal
 *
 * - Verify that PATCH
 *   /communityPlatform/adminUser/moderationCases/{caseKey}/appeals is
 *   accessible only to adminUser actors.
 * - Confirm that memberUser actors and unauthenticated requests are forbidden
 *   from listing appeals for a moderation case.
 *
 * Test workflow
 *
 * 1. Register an adminUser and obtain an admin session.
 * 2. As adminUser, create a moderation case.
 * 3. As adminUser, create a moderation action that belongs to the case.
 * 4. Register a memberUser and obtain a member session.
 * 5. As memberUser, create an appeal against the moderation action.
 * 6. As adminUser, list appeals for the case and verify the created appeal is
 *    present, along with basic pagination invariants.
 * 7. With an unauthenticated connection, attempt to list appeals and expect an
 *    authorization error.
 * 8. With a memberUser-authenticated connection, attempt to list appeals from the
 *    admin endpoint and expect an authorization error.
 */
export async function test_api_moderation_case_appeals_index_admin_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (join) and obtain initial admin session
  const adminUsername: string = `admin_${RandomGenerator.alphabets(8)}`;
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. As adminUser, create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. As adminUser, create a moderation action associated with this case
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

  // 4. Register a memberUser and obtain a member session
  const memberUsername: string = `member_${RandomGenerator.alphabets(8)}`;
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername as string & tags.MinLength<3> & tags.MaxLength<32>,
    email: memberEmail,
    password: memberPassword as string & tags.MinLength<8>,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. As memberUser, create an appeal for the moderation action
  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  // 6. Switch back to adminUser via login and list appeals for the case
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const appealsRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortField: "created_at",
    sortOrder: "desc",
    statuses: [createdAppeal.status],
    moderationActionId: moderationAction.id,
    moderationCaseId: moderationCase.id,
    appellantMemberUserId: createdAppeal.appellant_member_user.id,
  } satisfies ICommunityPlatformAppeal.IRequest;

  const adminAppealsPage: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.adminUser.moderationCases.appeals.index(
      connection,
      {
        caseKey: moderationCase.case_key,
        body: appealsRequestBody,
      },
    );
  typia.assert(adminAppealsPage);

  // Business-level validations on successful admin listing
  TestValidator.predicate(
    "admin listing should return at least one appeal",
    adminAppealsPage.data.length >= 1,
  );

  TestValidator.predicate(
    "admin listing pagination limit should be positive",
    adminAppealsPage.pagination.limit >= 1,
  );

  const hasExpectedAppeal: boolean = adminAppealsPage.data.some((summary) => {
    return (
      summary.moderation_action_id === moderationAction.id &&
      summary.appellant_memberuser_id === createdAppeal.appellant_member_user.id
    );
  });

  TestValidator.predicate(
    "admin listing should include the created appeal",
    hasExpectedAppeal,
  );

  // 7. Unauthenticated access should be rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to admin appeals index must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.appeals.index(
        unauthConn,
        {
          caseKey: moderationCase.case_key,
          body: appealsRequestBody,
        },
      );
    },
  );

  // 8. MemberUser-authenticated access to admin endpoint should be rejected
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  await TestValidator.error(
    "memberUser should not be allowed to list admin moderation case appeals",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.appeals.index(
        connection,
        {
          caseKey: moderationCase.case_key,
          body: appealsRequestBody,
        },
      );
    },
  );
}
