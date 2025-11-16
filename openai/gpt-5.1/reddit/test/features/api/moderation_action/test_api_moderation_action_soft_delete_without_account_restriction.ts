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
 * Validate that an authenticated adminUser can delete a moderation action
 * header created without any linked account restriction.
 *
 * This test exercises the happy-path workflow around the moderation action
 * deletion endpoint:
 *
 * 1. Register (join) a new adminUser to obtain an authorized admin context.
 * 2. Create a moderation case that will own the moderation action.
 * 3. Create a moderation action header bound to that case, explicitly not
 *    providing any account_restriction_id so the action has no account
 *    restriction linkage.
 * 4. Invoke the DELETE moderationActions endpoint to erase that action by id.
 *
 * Due to the limited API surface available in this context (no dedicated
 * moderationAction GET/search or content-level lookups), the test focuses on
 * validating that:
 *
 * - The authenticated adminUser can successfully create the prerequisite
 *   moderation case and moderation action header.
 * - The erase endpoint can be called end-to-end against a real, existing
 *   moderation action id without throwing.
 *
 * Deeper behaviors such as 404-after-delete semantics or cascading removal of
 * specialization rows are assumed to be covered in other tests where the
 * necessary read APIs are available.
 */
export async function test_api_moderation_action_soft_delete_without_account_restriction(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join) to obtain an authorized admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case that will own the moderation action.
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
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  TestValidator.equals(
    "created moderation case should have matching case_key",
    moderationCase.case_key,
    moderationCaseBody.case_key,
  );

  // 3. Create a moderation action header without any account restriction id.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
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
  typia.assert(moderationAction);

  TestValidator.equals(
    "created moderation action should be linked to the moderation case",
    moderationAction.moderation_case?.id ?? null,
    moderationCase.id,
  );

  // 4. Delete the moderation action via erase endpoint.
  await api.functional.communityPlatform.adminUser.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // With only the erase endpoint available (no read-after-delete API), the
  // strongest assertion we can make is that the call completes without
  // throwing. Use a simple predicate to document that expectation.
  TestValidator.predicate(
    "erase() should complete without throwing for an existing moderation action",
    true,
  );
}
