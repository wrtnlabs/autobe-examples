import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnUser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_admin_moderation_action_user_view_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized admin context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case under this admin context
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Optionally create an account restriction episode to link to the action
  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: new Date().toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Create a moderation action header linked to the case (and restriction)
  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 5a. Attempt to get user-targeted view without any Authorization header
  const unauthConnection: api.IConnection = { host: connection.host };

  await TestValidator.error(
    "unauthenticated access to user-targeted moderation action must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.user.at(
        unauthConnection,
        { moderationActionId: moderationAction.id },
      );
    },
  );

  // 5b. Attempt to get user-targeted view via a connection that does not
  // carry the adminUser token (simulate a non-admin or invalid-token context).
  const noAuthHeadersConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  await TestValidator.error(
    "non-admin/invalid-token access to user-targeted moderation action must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.user.at(
        noAuthHeadersConnection,
        { moderationActionId: moderationAction.id },
      );
    },
  );
}
