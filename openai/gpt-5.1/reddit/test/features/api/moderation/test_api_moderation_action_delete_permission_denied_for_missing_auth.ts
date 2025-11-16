import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Ensure moderation actions cannot be deleted without admin authentication.
 *
 * Business goal:
 *
 * - Destructive moderation operations (like deleting a moderation action) must
 *   require an authenticated adminUser context.
 * - Unauthorized delete attempts must fail and must not remove or mutate the
 *   underlying moderation action record.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join and obtain an
 *    authenticated context.
 * 2. Using that adminUser, create a moderation case via
 *    /communityPlatform/adminUser/moderationCases.
 * 3. Create a moderation action attached to the newly created case via
 *    /communityPlatform/adminUser/moderationActions.
 * 4. Construct a separate unauthenticated connection (no Authorization header) and
 *    attempt to delete the moderation action with DELETE
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}.
 * 5. Assert that the unauthorized delete attempt fails by expecting an error.
 * 6. Using the original authenticated connection, delete the same moderation
 *    action successfully, indirectly proving that the unauthorized attempt did
 *    not remove it.
 */
export async function test_api_moderation_action_delete_permission_denied_for_missing_auth(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser and obtain an authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a moderation case under this adminUser
  const caseBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Create a moderation action linked to the case
  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "warn_user",
    scope: "user",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const action: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionBody,
      },
    );
  typia.assert(action);

  // 4. Build an unauthenticated connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Unauthorized delete attempt must fail
  await TestValidator.error(
    "unauthorized moderation action delete should fail without auth",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.erase(
        unauthConnection,
        {
          moderationActionId: action.id,
        },
      );
    },
  );

  // 6. Authorized delete should still succeed, implying the action still existed
  await api.functional.communityPlatform.adminUser.moderationActions.erase(
    connection,
    {
      moderationActionId: action.id,
    },
  );
}
