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
 * Validate moderation action creation and business-level enforcement of
 * required foreign keys and taxonomy fields for adminUser actors.
 *
 * Business flow:
 *
 * 1. Register an adminUser via /auth/adminUser/join to obtain an authenticated
 *    context.
 * 2. Create a moderation case via /communityPlatform/adminUser/moderationCases as
 *    the foreign-key parent for moderation actions.
 * 3. Create a baseline moderation action via
 *    /communityPlatform/adminUser/moderationActions using the valid
 *    moderation_case_id and supported taxonomy strings, and assert success.
 * 4. Attempt Variant A: create a moderation action using a non-existent
 *    moderation_case_id (different random UUID) and assert that the API rejects
 *    the request.
 * 5. Attempt Variant B: create a moderation action using syntactically valid but
 *    unsupported taxonomy values for action_type, scope, and reason_category
 *    and assert rejection.
 * 6. Create another valid moderation action to ensure the endpoint still accepts
 *    correct payloads after the failure scenarios.
 */
export async function test_api_moderation_action_creation_validation_of_required_fields(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to get authenticated admin context.
  const joinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case that will be referenced by moderation actions.
  const caseKeyBase = RandomGenerator.alphaNumeric(12);
  const moderationCaseBody = {
    case_key: `CASE-${caseKeyBase}`,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: undefined,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Create a baseline valid moderation action.
  const baselineActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: undefined,
    action_type: "warn_user",
    scope: "user",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const baselineAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: baselineActionBody,
      },
    );
  typia.assert(baselineAction);

  // Basic semantic checks: ensure core fields echo back or relate correctly.
  TestValidator.equals(
    "baseline moderation action should reference created case",
    baselineAction.moderation_case?.id ?? moderationCase.id,
    moderationCase.id,
  );
  TestValidator.equals(
    "baseline action_type should echo input",
    baselineAction.action_type,
    baselineActionBody.action_type,
  );
  TestValidator.equals(
    "baseline scope should echo input",
    baselineAction.scope,
    baselineActionBody.scope,
  );
  TestValidator.equals(
    "baseline reason_category should echo input",
    baselineAction.reason_category,
    baselineActionBody.reason_category,
  );

  // 4. Variant A: invalid moderation_case_id (non-existent UUID).
  let invalidModerationCaseId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (invalidModerationCaseId === moderationCase.id) {
    invalidModerationCaseId = typia.random<string & tags.Format<"uuid">>();
  }

  const invalidCaseActionBody = {
    moderation_case_id: invalidModerationCaseId,
    account_restriction_id: baselineActionBody.account_restriction_id,
    action_type: baselineActionBody.action_type,
    scope: baselineActionBody.scope,
    reason_category: baselineActionBody.reason_category,
    reason_detail: baselineActionBody.reason_detail,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  await TestValidator.error(
    "creating moderation action with non-existent moderation_case_id should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.create(
        connection,
        {
          body: invalidCaseActionBody,
        },
      );
    },
  );

  // 5. Variant B: unsupported taxonomy values while remaining type-correct.
  const invalidTaxonomyActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: baselineActionBody.account_restriction_id,
    action_type: "invalid_action_type_code",
    scope: "invalid_scope_code",
    reason_category: "invalid_reason_category_code",
    reason_detail: baselineActionBody.reason_detail,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  await TestValidator.error(
    "creating moderation action with unsupported taxonomy values should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.create(
        connection,
        {
          body: invalidTaxonomyActionBody,
        },
      );
    },
  );

  // 6. Create another valid moderation action to ensure the endpoint still
  // accepts well-formed data after error scenarios.
  const followupActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "remove_content",
    scope: "content",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const followupAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: followupActionBody,
      },
    );
  typia.assert(followupAction);

  TestValidator.equals(
    "followup moderation action should reference created case",
    followupAction.moderation_case?.id ?? moderationCase.id,
    moderationCase.id,
  );
}
