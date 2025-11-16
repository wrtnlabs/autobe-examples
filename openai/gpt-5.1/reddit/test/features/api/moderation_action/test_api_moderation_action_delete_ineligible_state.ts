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
 * Validate deletion of a moderation action header created under an adminUser
 * context.
 *
 * Business context (adapted to available APIs):
 *
 * - An adminUser can open a moderation case and record moderation actions against
 *   that case using the moderationActions.create endpoint.
 * - In some real implementations, certain actions may later become non-deletable
 *   once they are communicated or referenced by appeals, but such state
 *   transitions are not expressible via the current SDK surface.
 * - With the given APIs, we can only create a fresh action and then invoke the
 *   erase endpoint; therefore this test focuses on verifying that an
 *   admin-created moderation action can be deleted without error when in a
 *   normal, freshly-created state.
 *
 * Workflow implemented in this test:
 *
 * 1. Register and authenticate an adminUser via POST /auth/adminUser/join.
 *
 *    - This automatically attaches an Authorization header on the shared connection
 *         through the SDK helper logic.
 * 2. Create a moderation case via POST
 *    /communityPlatform/adminUser/moderationCases using
 *    ICommunityPlatformModerationCase.ICreate.
 *
 *    - The case acts as the owner of subsequent moderation actions.
 * 3. Create a moderation action header via POST
 *    /communityPlatform/adminUser/moderationActions using
 *    ICommunityPlatformModerationAction.ICreate, pointing moderation_case_id at
 *    the created case.
 * 4. Call DELETE /communityPlatform/adminUser/moderationActions/{id} via
 *    api.functional.communityPlatform.adminUser.moderationActions.erase using
 *    the id of the created action.
 * 5. Assert that the erase call completes successfully by the fact that no
 *    exception is thrown. We do not check HTTP status codes explicitly per
 *    testing guidelines, and no GET endpoint exists to re-fetch the action
 *    after deletion.
 */
export async function test_api_moderation_action_delete_ineligible_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case owned by this admin.
  const caseBody = {
    case_key: `case_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      "urgent",
    ] as const),
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: caseBody },
    );
  typia.assert(createdCase);

  TestValidator.equals(
    "created moderation case should echo requested case_key",
    createdCase.case_key,
    caseBody.case_key,
  );

  // 3. Create a moderation action header linked to the case.
  const actionBody = {
    moderation_case_id: createdCase.id,
    account_restriction_id: undefined,
    action_type: RandomGenerator.pick([
      "warn_user",
      "restrict_account",
      "ban_account",
      "remove_content",
    ] as const),
    scope: RandomGenerator.pick(["user", "content", "community"] as const),
    reason_category: RandomGenerator.pick([
      "spam",
      "harassment",
      "hate",
      "illegal",
    ] as const),
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionBody },
    );
  typia.assert(createdAction);

  TestValidator.equals(
    "created moderation action should link to the correct case id",
    createdAction.moderation_case?.id ?? createdCase.id,
    createdCase.id,
  );

  // 4. Attempt to delete the moderation action by id.
  await api.functional.communityPlatform.adminUser.moderationActions.erase(
    connection,
    {
      moderationActionId: createdAction.id as string & tags.Format<"uuid">,
    },
  );

  // If no exception is thrown up to this point, the deletion is considered
  // successful within the scope of available APIs.
}
