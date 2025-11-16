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

/**
 * Validate that an authenticated adminUser can retrieve a user-targeted
 * moderation action view, including the linked moderation case and account
 * restriction episode, using the user specialization endpoint.
 *
 * Business flow:
 *
 * 1. Admin joins and becomes authenticated.
 * 2. Admin opens a moderation case.
 * 3. Admin creates an account restriction episode targeting a member user account
 *    type.
 * 4. Admin records a user-scoped moderation action header linked to the moderation
 *    case and the account restriction.
 * 5. Admin retrieves the user-targeted moderation action details view via GET
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}/user.
 *
 * The test asserts that the returned ICommunityPlatformModerationActionOnUser
 * is structurally valid, that the moderation_action header matches the one just
 * created (including id, scope, action_type, and linked account_restriction),
 * and that the target_memberuser linkage is consistent.
 */
export async function test_api_admin_moderation_action_user_view_with_account_restriction(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Admin opens a moderation case.
  const caseKey = `case-${RandomGenerator.alphaNumeric(12)}`;
  const moderationCaseBody = {
    case_key: caseKey,
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

  // 3. Admin creates an account restriction episode targeting memberUser.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const accountRestrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: accountRestrictionBody },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Admin records a user-scoped moderation action header linked to the
  //    moderation case and the account restriction.
  const actionType = "restrict_account";
  const actionScope = "user";
  const reasonCategory = accountRestrictionBody.reason_category;
  const reasonDetail = RandomGenerator.paragraph({ sentences: 5 });

  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: actionType,
    scope: actionScope,
    reason_category: reasonCategory,
    reason_detail: reasonDetail,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 5. Admin retrieves the user-targeted moderation action view.
  const view: ICommunityPlatformModerationActionOnUser =
    await api.functional.communityPlatform.adminUser.moderationActions.user.at(
      connection,
      { moderationActionId: moderationAction.id },
    );
  typia.assert<ICommunityPlatformModerationActionOnUser>(view);

  // ---- Assertions on linkage and business semantics ----

  // moderation_action.id must match the created header id.
  TestValidator.equals(
    "moderation_action.id matches the created moderationAction.id",
    view.moderation_action.id,
    moderationAction.id,
  );

  // moderation_action.scope and action_type must reflect user-targeted
  // enforcement type used at creation.
  TestValidator.equals(
    "moderation_action.scope is 'user'",
    view.moderation_action.scope,
    actionScope,
  );
  TestValidator.equals(
    "moderation_action.action_type is the expected action type",
    view.moderation_action.action_type,
    actionType,
  );

  // Linked account_restriction summary should be present and reference the
  // restriction we created.
  TestValidator.predicate(
    "moderation_action.account_restriction is present",
    view.moderation_action.account_restriction !== null &&
      view.moderation_action.account_restriction !== undefined,
  );
  if (
    view.moderation_action.account_restriction !== null &&
    view.moderation_action.account_restriction !== undefined
  ) {
    TestValidator.equals(
      "linked account_restriction.id matches restriction.id",
      view.moderation_action.account_restriction.id,
      restriction.id,
    );
  }

  // target_memberuser_id should match the embedded target_memberUser.id.
  TestValidator.equals(
    "target_memberuser_id matches target_memberUser.id",
    view.target_memberuser_id,
    view.target_memberUser.id,
  );

  // created_at must be a non-empty string; typia.assert already guarantees
  // proper date-time format.
  TestValidator.predicate(
    "created_at is a non-empty ISO datetime string",
    typeof view.created_at === "string" && view.created_at.length > 0,
  );

  // deleted_at should be null for an active specialization.
  TestValidator.equals(
    "deleted_at is null for an active user-targeted moderation action",
    view.deleted_at ?? null,
    null,
  );
}
