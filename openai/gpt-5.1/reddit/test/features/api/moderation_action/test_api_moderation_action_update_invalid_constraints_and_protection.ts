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
 * Validate that moderation action updates preserve core identity invariants
 * while allowing controlled metadata and linkage changes.
 *
 * Business flow (rewritten to fit available APIs/DTOs):
 *
 * 1. Join as an adminUser to obtain an authenticated admin context.
 * 2. Create a moderation case that will own the moderation action.
 * 3. Create an account restriction episode that can be linked from the action.
 * 4. Create a baseline moderation action header linked to the case and
 *    restriction.
 * 5. Variant A: update action_type and scope while leaving linkage intact, and
 *    confirm that identifiers (id, moderation_case.id, actor_admin.id) remain
 *    stable while the mutable fields change.
 * 6. Variant B: explicitly null out account_restriction_id to detach the
 *    restriction, confirming that the linkage is removed while other fields
 *    stay the same.
 * 7. Variant C: update only reason_category and reason_detail, omitting other
 *    fields, to verify that omitted optional fields are not altered by the
 *    update.
 *
 * This scenario focuses on invariants that can actually be observed from
 * ICommunityPlatformModerationAction: IDs of the action, its case summary, and
 * its actor_admin summary must never change across updates, while fields
 * exposed by IUpdate (reason_*, account_restriction_id, action_type, scope) can
 * be modified subject to backend rules.
 */
export async function test_api_moderation_action_update_invalid_constraints_and_protection(
  connection: api.IConnection,
) {
  // 1. Join as adminUser (authentication context)
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case
  const caseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(12)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: caseBody },
    );
  typia.assert(moderationCase);

  // 3. Create an account restriction episode
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60); // +1 hour

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: now.toISOString(),
    ends_at: later.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 4. Create baseline moderation action header linked to case and restriction
  const actionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const baselineAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: actionCreateBody },
    );
  typia.assert(baselineAction);

  const baselineId = baselineAction.id;
  const baselineCaseId =
    baselineAction.moderation_case?.id ?? moderationCase.id;
  const baselineActorAdminId = baselineAction.actor_admin?.id;

  // Ensure baseline invariants
  TestValidator.equals(
    "baseline action id should match itself",
    baselineAction.id,
    baselineId,
  );
  TestValidator.equals(
    "baseline moderation case id should match created case",
    baselineCaseId,
    moderationCase.id,
  );
  TestValidator.predicate(
    "baseline actor_admin should be present",
    baselineActorAdminId !== undefined,
  );

  // 5. Variant A: change action_type and scope while keeping linkage
  const variantAUpdateBody = {
    action_type: "warn_user",
    scope: "content",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    // account_restriction_id intentionally omitted to keep existing linkage
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const actionAfterVariantA: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: baselineId,
        body: variantAUpdateBody,
      },
    );
  typia.assert(actionAfterVariantA);

  // Invariants: id, case id, actor admin id remain the same
  TestValidator.equals(
    "Variant A - action id must remain unchanged",
    actionAfterVariantA.id,
    baselineId,
  );
  TestValidator.equals(
    "Variant A - moderation case id must remain unchanged",
    actionAfterVariantA.moderation_case?.id ?? baselineCaseId,
    baselineCaseId,
  );
  if (baselineActorAdminId !== undefined) {
    TestValidator.equals(
      "Variant A - actor_admin id must remain unchanged",
      actionAfterVariantA.actor_admin?.id ?? baselineActorAdminId,
      baselineActorAdminId,
    );
  }

  // Mutated fields should reflect new values
  TestValidator.equals(
    "Variant A - action_type should be updated",
    actionAfterVariantA.action_type,
    variantAUpdateBody.action_type,
  );
  TestValidator.equals(
    "Variant A - scope should be updated",
    actionAfterVariantA.scope,
    variantAUpdateBody.scope,
  );
  TestValidator.equals(
    "Variant A - reason_category should be updated",
    actionAfterVariantA.reason_category,
    variantAUpdateBody.reason_category,
  );
  TestValidator.equals(
    "Variant A - reason_detail should be updated",
    actionAfterVariantA.reason_detail ?? null,
    variantAUpdateBody.reason_detail ?? null,
  );

  // 6. Variant B: detach restriction by setting account_restriction_id to null
  const variantBUpdateBody = {
    account_restriction_id: null,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const actionAfterVariantB: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: baselineId,
        body: variantBUpdateBody,
      },
    );
  typia.assert(actionAfterVariantB);

  TestValidator.equals(
    "Variant B - action id must remain unchanged",
    actionAfterVariantB.id,
    baselineId,
  );
  TestValidator.equals(
    "Variant B - moderation case id must remain unchanged",
    actionAfterVariantB.moderation_case?.id ?? baselineCaseId,
    baselineCaseId,
  );
  if (baselineActorAdminId !== undefined) {
    TestValidator.equals(
      "Variant B - actor_admin id must remain unchanged",
      actionAfterVariantB.actor_admin?.id ?? baselineActorAdminId,
      baselineActorAdminId,
    );
  }

  TestValidator.predicate(
    "Variant B - account_restriction should be detached or absent",
    actionAfterVariantB.account_restriction === null ||
      actionAfterVariantB.account_restriction === undefined,
  );

  // 7. Variant C: update only reason fields, leaving others untouched
  const variantCUpdateBody = {
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const actionAfterVariantC: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: baselineId,
        body: variantCUpdateBody,
      },
    );
  typia.assert(actionAfterVariantC);

  // Identity invariants again
  TestValidator.equals(
    "Variant C - action id must remain unchanged",
    actionAfterVariantC.id,
    baselineId,
  );
  TestValidator.equals(
    "Variant C - moderation case id must remain unchanged",
    actionAfterVariantC.moderation_case?.id ?? baselineCaseId,
    baselineCaseId,
  );
  if (baselineActorAdminId !== undefined) {
    TestValidator.equals(
      "Variant C - actor_admin id must remain unchanged",
      actionAfterVariantC.actor_admin?.id ?? baselineActorAdminId,
      baselineActorAdminId,
    );
  }

  // account_restriction linkage should still be detached as in Variant B
  TestValidator.predicate(
    "Variant C - account_restriction should remain detached",
    actionAfterVariantC.account_restriction === null ||
      actionAfterVariantC.account_restriction === undefined,
  );

  // action_type and scope should remain what Variant A set (no change because omitted)
  TestValidator.equals(
    "Variant C - action_type should remain as Variant A",
    actionAfterVariantC.action_type,
    actionAfterVariantA.action_type,
  );
  TestValidator.equals(
    "Variant C - scope should remain as Variant A",
    actionAfterVariantC.scope,
    actionAfterVariantA.scope,
  );

  // reason fields should be updated to Variant C values
  TestValidator.equals(
    "Variant C - reason_category should be updated",
    actionAfterVariantC.reason_category,
    variantCUpdateBody.reason_category,
  );
  TestValidator.equals(
    "Variant C - reason_detail should be updated",
    actionAfterVariantC.reason_detail ?? null,
    variantCUpdateBody.reason_detail ?? null,
  );
}
