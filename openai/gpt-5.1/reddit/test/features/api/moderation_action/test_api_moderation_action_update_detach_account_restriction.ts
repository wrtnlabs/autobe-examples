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
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Detach an existing account restriction linkage from a moderation action.
 *
 * Business workflow:
 *
 * 1. Register an adminUser (join) to obtain an authorized admin context.
 * 2. Create a moderation case that moderation actions will belong to.
 * 3. Create an account restriction episode that represents technical enforcement.
 * 4. Create a moderation action header linked to both the moderation case and the
 *    account restriction.
 * 5. Update the moderation action with account_restriction_id explicitly set to
 *    null to detach the linkage.
 * 6. Validate that the returned moderation action has account_restriction cleared
 *    while other core fields remain stable and updated_at changes.
 */
export async function test_api_moderation_action_update_detach_account_restriction(
  connection: api.IConnection,
) {
  // 1. Authenticate as adminUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create an account restriction episode
  const now = new Date();
  const restrictionBody = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Create a moderation action header linked to the restriction
  const moderationActionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(createdAction);

  // Verify initial linkage exists
  TestValidator.predicate(
    "initial moderation action should expose account_restriction summary",
    createdAction.account_restriction !== null &&
      createdAction.account_restriction !== undefined,
  );

  const originalUpdatedAt = createdAction.updated_at;
  const originalActionType = createdAction.action_type;
  const originalScope = createdAction.scope;
  const originalReasonCategory = createdAction.reason_category;
  const originalReasonDetail = createdAction.reason_detail ?? null;
  const originalCaseSummary = createdAction.moderation_case;

  // 5. Update moderation action: explicitly detach account restriction
  const updateBody = {
    account_restriction_id: null,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: createdAction.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(updatedAction);

  // 6. Validate response semantics
  // 6-1. account_restriction should now be null, confirming detachment
  TestValidator.equals(
    "account_restriction should be null after detachment",
    updatedAction.account_restriction,
    null,
  );

  // 6-2. Core fields should remain unchanged
  TestValidator.equals(
    "action_type must remain unchanged after detachment",
    updatedAction.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "scope must remain unchanged after detachment",
    updatedAction.scope,
    originalScope,
  );
  TestValidator.equals(
    "reason_category must remain unchanged after detachment",
    updatedAction.reason_category,
    originalReasonCategory,
  );
  TestValidator.equals(
    "reason_detail must remain unchanged after detachment",
    updatedAction.reason_detail ?? null,
    originalReasonDetail,
  );

  // moderation_case summary should remain the same
  TestValidator.equals(
    "moderation_case summary must remain unchanged",
    updatedAction.moderation_case,
    originalCaseSummary,
  );

  // id and created_at should remain unchanged
  TestValidator.equals(
    "id must remain unchanged after update",
    updatedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedAction.created_at,
    createdAction.created_at,
  );

  // 6-3. updated_at should reflect an update (be different from original)
  TestValidator.notEquals(
    "updated_at must change after detachment update",
    updatedAction.updated_at,
    originalUpdatedAt,
  );
}
