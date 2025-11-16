import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnUser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_admin_moderation_action_user_view_without_account_restriction(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "medium",
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

  // 3. Create a moderation action header without account restriction id
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    action_type: "warn_user",
    scope: "user",
    reason_category: "harassment",
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

  // Sanity check: ensure no account restriction is attached on header
  TestValidator.predicate(
    "created moderation action should not have account_restriction",
    () =>
      moderationAction.account_restriction === null ||
      moderationAction.account_restriction === undefined,
  );

  // 4. Retrieve user-targeted moderation action details
  const actionOnUser: ICommunityPlatformModerationActionOnUser =
    await api.functional.communityPlatform.adminUser.moderationActions.user.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert<ICommunityPlatformModerationActionOnUser>(actionOnUser);

  const header = actionOnUser.moderation_action;

  // 5. Assertions: ids, scope, action_type
  TestValidator.equals(
    "moderation action id matches in user view",
    header.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "scope is user for moderation action",
    header.scope,
    moderationAction.scope,
  );
  TestValidator.equals(
    "action_type matches creation",
    header.action_type,
    moderationAction.action_type,
  );

  // moderation case linkage
  if (header.moderation_case !== undefined) {
    TestValidator.equals(
      "moderation case id propagated into header summary",
      header.moderation_case.id,
      moderationCase.id,
    );
  }

  // actor admin linkage
  TestValidator.predicate(
    "actor_admin summary is present on moderation action header",
    () => header.actor_admin !== undefined,
  );

  // target member user consistency
  TestValidator.equals(
    "target_memberuser_id matches target_memberUser summary id",
    actionOnUser.target_memberUser.id,
    actionOnUser.target_memberuser_id,
  );

  // 6. No account restriction should be attached in the user view header
  TestValidator.predicate(
    "no account restriction attached to non-restrictive moderation action",
    () =>
      header.account_restriction === null ||
      header.account_restriction === undefined,
  );
}
