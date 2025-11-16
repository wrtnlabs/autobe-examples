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
 * Validate updating reason metadata of a moderation action header.
 *
 * This e2e test covers the happy-path workflow where an authenticated adminUser
 * creates a moderation case and an associated moderation action, then updates
 * only the reason metadata (reason_category and reason_detail) of that
 * moderation action via the PUT
 * /communityPlatform/adminUser/moderationActions/{moderationActionId}
 * endpoint.
 *
 * Business goals:
 *
 * - Ensure that admins can refine or correct rationale metadata for a moderation
 *   action without changing its identity.
 * - Verify that immutable audit properties (id, created_at, actor,
 *   moderation_case linkage) are preserved by the update.
 * - Confirm that only explicitly provided mutable fields change and that
 *   unspecified fields remain untouched.
 *
 * Steps:
 *
 * 1. Join as a new adminUser using /auth/adminUser/join.
 * 2. Create a moderation case using /communityPlatform/adminUser/moderationCases
 *    with a simple case_key, title, description, status, and priority.
 * 3. Create a moderation action header linked to that case using
 *    /communityPlatform/adminUser/moderationActions with fields:
 *
 *    - Moderation_case_id: case.id
 *    - Action_type: e.g. "warn_user"
 *    - Scope: e.g. "user"
 *    - Reason_category: e.g. "spam"
 *    - Reason_detail: some text rationale
 * 4. Capture the original moderation action’s:
 *
 *    - Id
 *    - Created_at
 *    - Updated_at
 *    - Action_type
 *    - Scope
 *    - Reason_category
 *    - Reason_detail
 *    - Moderation_case summary id and case_key
 *    - Actor_admin summary id
 *    - Account_restriction summary (if present)
 * 5. Call update on the moderation action via
 *    api.functional.communityPlatform.adminUser.moderationActions.update with:
 *
 *    - ModerationActionId: original id
 *    - Body: ICommunityPlatformModerationAction.IUpdate where
 *
 *         - Reason_category is changed from the original to a different valid category
 *                   string (e.g. "harassment").
 *         - Reason_detail is changed to some refined explanatory text.
 *         - All other optional fields are omitted so the backend keeps them unchanged.
 * 6. Validate the response:
 *
 *    - Typia.assert on the returned ICommunityPlatformModerationAction.
 *    - Id is equal to the original id.
 *    - Created_at is equal to the original created_at.
 *    - Updated_at is greater than or equal to the original updated_at when comparing
 *         parsed timestamps.
 *    - Reason_category equals the new value.
 *    - Reason_detail equals the new value.
 *    - Action_type and scope still equal the original values.
 *    - Moderation_case summary id equals the original case id.
 *    - Actor_admin summary id remains the same as the joined admin.
 *    - Account_restriction summary is unchanged (if it was undefined or null it
 *         remains so; if it were non-null we assert id equality).
 */
export async function test_api_moderation_action_update_reason_metadata(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain authenticated context
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

  // 2. Create a moderation case
  const caseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Create a baseline moderation action for that case
  const originalReasonCategory = "spam";
  const originalReasonDetail = RandomGenerator.paragraph({ sentences: 4 });

  const actionCreateBody = {
    moderation_case_id: moderationCase.id,
    action_type: "warn_user",
    scope: "user",
    reason_category: originalReasonCategory,
    reason_detail: originalReasonDetail,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionCreateBody,
      },
    );
  typia.assert(createdAction);

  // Capture original immutable & reference fields
  const originalId = createdAction.id;
  const originalCreatedAt = createdAction.created_at;
  const originalUpdatedAt = createdAction.updated_at;
  const originalActionType = createdAction.action_type;
  const originalScope = createdAction.scope;
  const originalModerationCaseSummary = createdAction.moderation_case;
  const originalActorAdminSummary = createdAction.actor_admin;
  const originalAccountRestrictionSummary = createdAction.account_restriction;

  // Sanity checks that relations are wired as expected when present
  if (originalModerationCaseSummary !== undefined) {
    TestValidator.equals(
      "moderation_case summary id matches case.id",
      originalModerationCaseSummary.id,
      moderationCase.id,
    );
  }
  if (originalActorAdminSummary !== undefined) {
    TestValidator.equals(
      "actor_admin summary id matches adminAuthorized.id",
      originalActorAdminSummary.id,
      adminAuthorized.id,
    );
  }

  // 4. Prepare update body to change reason_category and reason_detail only
  const updatedReasonCategory =
    originalReasonCategory === "spam" ? "harassment" : "spam";
  const updatedReasonDetail = RandomGenerator.paragraph({ sentences: 5 });

  const updateBody = {
    reason_category: updatedReasonCategory,
    reason_detail: updatedReasonDetail,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.update(
      connection,
      {
        moderationActionId: createdAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // 5. Validate identity and timestamps
  TestValidator.equals(
    "moderation action id remains unchanged",
    updatedAction.id,
    originalId,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedAction.created_at,
    originalCreatedAt,
  );

  const originalUpdatedAtMs = Date.parse(originalUpdatedAt);
  const newUpdatedAtMs = Date.parse(updatedAction.updated_at);
  TestValidator.predicate(
    "updated_at is greater than or equal to original updated_at",
    newUpdatedAtMs >= originalUpdatedAtMs,
  );

  // 6. Validate updated reason metadata
  TestValidator.equals(
    "reason_category updated to new value",
    updatedAction.reason_category,
    updatedReasonCategory,
  );
  TestValidator.equals(
    "reason_detail updated to new value",
    updatedAction.reason_detail ?? null,
    updatedReasonDetail,
  );

  // 7. Validate other fields preserved
  TestValidator.equals(
    "action_type preserved after update",
    updatedAction.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "scope preserved after update",
    updatedAction.scope,
    originalScope,
  );

  if (originalModerationCaseSummary !== undefined) {
    // After update, moderation_case should still be present and have same id
    if (updatedAction.moderation_case !== undefined) {
      TestValidator.equals(
        "moderation_case summary id preserved",
        updatedAction.moderation_case.id,
        originalModerationCaseSummary.id,
      );
    } else {
      TestValidator.predicate(
        "updatedAction.moderation_case remains defined when originally defined",
        false,
      );
    }
  }
  if (originalActorAdminSummary !== undefined) {
    if (updatedAction.actor_admin !== undefined) {
      TestValidator.equals(
        "actor_admin summary id preserved",
        updatedAction.actor_admin.id,
        originalActorAdminSummary.id,
      );
    } else {
      TestValidator.predicate(
        "updatedAction.actor_admin remains defined when originally defined",
        false,
      );
    }
  }

  if (originalAccountRestrictionSummary === null) {
    TestValidator.equals(
      "account_restriction remains null when originally null",
      updatedAction.account_restriction ?? null,
      null,
    );
  } else if (originalAccountRestrictionSummary !== undefined) {
    if (
      updatedAction.account_restriction !== undefined &&
      updatedAction.account_restriction !== null
    ) {
      TestValidator.equals(
        "account_restriction id preserved when originally set",
        updatedAction.account_restriction.id,
        originalAccountRestrictionSummary.id,
      );
    } else {
      TestValidator.predicate(
        "updatedAction.account_restriction remains defined when originally defined",
        false,
      );
    }
  }
}
