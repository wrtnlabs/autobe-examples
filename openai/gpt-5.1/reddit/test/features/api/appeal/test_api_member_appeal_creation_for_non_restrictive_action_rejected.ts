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

/**
 * Ensure non-appealable moderation actions cannot be appealed by member users.
 *
 * Business context:
 *
 * - Member users can file appeals against certain moderation actions that impact
 *   their account or content.
 * - Some moderation actions (for example, purely informational warnings or
 *   actions without any attached account restriction) are defined by business
 *   rules as non-appealable.
 * - When a member tries to appeal such a non-appealable action, the backend must
 *   reject the request with a business-logic error, and no appeal row must be
 *   created.
 *
 * This test covers the negative path where the member attempts to appeal an
 * action that should not be appealable.
 *
 * Flow:
 *
 * 1. Create an adminUser account via /auth/adminUser/join (which also
 *    authenticates the admin in the SDK connection).
 * 2. Create a memberUser via /auth/memberUser/join.
 * 3. Switch back to the adminUser via /auth/adminUser/login to ensure admin
 *    context for moderation operations.
 * 4. As adminUser, create a moderation case via
 *    /communityPlatform/adminUser/moderationCases with basic metadata.
 * 5. As adminUser, create a moderation action via
 *    /communityPlatform/adminUser/moderationActions associated with the case,
 *    using a benign action_type/scope combination we treat as non-appealable
 *    (e.g. "informational_warning" with scope "user").
 * 6. Switch authentication to the memberUser via /auth/memberUser/login.
 * 7. As memberUser, attempt to create an appeal via
 *    /communityPlatform/memberUser/appeals using the moderation_action.id and a
 *    justification string.
 * 8. Expect the appeal creation call to fail (throw HttpError) rather than
 *    returning an ICommunityPlatformAppeal. Validate this using
 *    TestValidator.error.
 */
export async function test_api_member_appeal_creation_for_non_restrictive_action_rejected(
  connection: api.IConnection,
) {
  // 1. Create an adminUser (auto-authenticates as adminUser)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassw0rd!", // satisfies tags.Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a memberUser (auto-authenticates as memberUser, but we'll log back in as admin later)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: "MemberPassw0rd!", // satisfies MinLength<8>
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. Switch back to adminUser via login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  // 4. As adminUser, create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "low",
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

  // 5. As adminUser, create a moderation action that we treat as non-appealable
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "informational_warning",
    scope: "user",
    reason_category: "informational",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 6. Switch authentication to the memberUser
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 7. As memberUser, attempt to create an appeal for the non-appealable action
  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  // 8. Validate that appeal creation fails with a business logic error
  await TestValidator.error(
    "non-appealable moderation action cannot be appealed",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        connection,
        {
          body: appealCreateBody,
        },
      );
    },
  );
}
