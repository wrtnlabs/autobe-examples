import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify partial update of moderation action descriptive fields only.
 *
 * Business goal
 *
 * - Ensure platform admins can refine textual explanation fields of an existing
 *   moderation action (reason_summary and notes_internal) without changing core
 *   enforcement semantics (action_type and target_scope).
 * - Confirm that the update endpoint behaves like a PATCH-style partial update
 *   even though it uses HTTP PUT and ICommunityPlatformModerationAction.IUpdate
 *   with all-optional fields.
 *
 * Scenario
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated platformAdmin context (token handled automatically by SDK).
 * 2. Using that admin context, create a visibility level via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels using
 *    ICommunityPlatformCommunityVisibilityLevel.ICreate.
 * 3. Register a member user via POST /auth/memberUser/join and rely on SDK to
 *    switch the Authorization header to memberUser.
 * 4. As the member user, create a community via POST
 *    /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate, referencing the previously created
 *    visibility level by code.
 * 5. As the member user, subscribe to that community using POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions with
 *    ICommunityPlatformCommunitySubscription.ICreate so that there is a valid
 *    community context for reporting.
 * 6. As the member user, create a report via POST
 *    /communityPlatform/memberUser/reports with a valid reporter_type and a
 *    random UUID for report_reason_category_id (since we do not have an API to
 *    create real categories in this scope). The concrete referential validity
 *    of the category is out-of-scope for this test; focus is on the moderation
 *    action update behavior.
 * 7. Switch back to platformAdmin using POST /auth/platformAdmin/login so that
 *    subsequent calls run under platformAdmin authorization.
 * 8. Create an initial moderation action for that report via POST
 *    /communityPlatform/platformAdmin/reports/{reportId}/moderationActions
 *    using ICommunityPlatformModerationAction.ICreate:
 *
 *    - Set action_type to a fixed string, e.g. "warn_user".
 *    - Set target_scope to a fixed string, e.g. "user".
 *    - Optionally set an initial reason_summary and notes_internal (e.g. short
 *         strings).
 *    - Optionally set community_id to the created community id.
 * 9. Capture the created moderation action's id, action_type, target_scope,
 *    reason_summary, notes_internal, created_at, and updated_at for later
 *    comparisons.
 * 10. Call PUT
 *     /communityPlatform/platformAdmin/reports/{reportId}/moderationActions/{moderationActionId}
 *     using
 *     api.functional.communityPlatform.platformAdmin.reports.moderationActions.update
 *     with a body that only supplies new values for reason_summary and
 *     notes_internal, omitting action_type and target_scope entirely, using
 *     ICommunityPlatformModerationAction.IUpdate.
 * 11. Assert that the response is a valid ICommunityPlatformModerationAction via
 *     typia.assert.
 * 12. Validate via TestValidator that:
 *
 *     - Action_type of the updated action equals the original action_type.
 *     - Target_scope of the updated action equals the original target_scope.
 *     - Reason_summary of the updated action equals the newly provided reason_summary
 *           string.
 *     - Notes_internal of the updated action equals the newly provided notes_internal
 *           string.
 *     - Updated_at of the updated action is different from the original updated_at
 *           and is not earlier than created_at (i.e., updated_at >=
 *           created_at).
 * 13. (Optional) Since there is no dedicated read endpoint beyond the update
 *     response itself in this SDK subset, treat the update response as the
 *     persisted state and rely on it to assert final field values.
 *
 * Technical constraints
 *
 * - Use only the imports provided in the template; do not add new ones.
 * - Use RandomGenerator and typia.random with proper generic arguments for
 *   generating test data.
 * - Use DTO variants correctly: IJoin/ILogin/ICreate/IUpdate versus base types as
 *   required by each SDK function.
 * - Do not manipulate connection.headers directly; rely on auth SDK functions for
 *   actor switching.
 * - All SDK calls must be awaited.
 */
export async function test_api_moderation_action_update_reason_and_notes_only(
  connection: api.IConnection,
) {
  // 1. Register platform admin and authenticate
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility level as platform admin
  const visibilityCode = `vl_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register member user (SDK switches Authorization to memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community as member user, referencing the visibility code
  const communityCreateBody = {
    identifier: `comm_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Subscribe the member to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 6. Create a report as member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 7. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. Create initial moderation action for the report
  const initialReasonSummary = RandomGenerator.paragraph({ sentences: 2 });
  const initialNotesInternal = RandomGenerator.paragraph({ sentences: 3 });

  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: initialReasonSummary,
    notes_internal: initialNotesInternal,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const initialAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(initialAction);

  const originalActionType = initialAction.action_type;
  const originalTargetScope = initialAction.target_scope;
  const originalReasonSummary = initialAction.reason_summary ?? null;
  const originalNotesInternal = initialAction.notes_internal ?? null;
  const originalCreatedAt = initialAction.created_at;
  const originalUpdatedAt = initialAction.updated_at;

  // 9. Prepare partial update body with only reason_summary and notes_internal
  const updatedReasonSummary = RandomGenerator.paragraph({ sentences: 2 });
  const updatedNotesInternal = RandomGenerator.paragraph({ sentences: 4 });

  const moderationActionUpdateBody = {
    reason_summary: updatedReasonSummary,
    notes_internal: updatedNotesInternal,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.update(
      connection,
      {
        reportId: report.id,
        moderationActionId: initialAction.id,
        body: moderationActionUpdateBody,
      },
    );
  typia.assert(updatedAction);

  // 10. Field-level assertions
  TestValidator.equals(
    "action_type should remain unchanged after partial update",
    updatedAction.action_type,
    originalActionType,
  );

  TestValidator.equals(
    "target_scope should remain unchanged after partial update",
    updatedAction.target_scope,
    originalTargetScope,
  );

  TestValidator.equals(
    "reason_summary should be updated to new value",
    updatedAction.reason_summary ?? null,
    updatedReasonSummary,
  );

  TestValidator.equals(
    "notes_internal should be updated to new value",
    updatedAction.notes_internal ?? null,
    updatedNotesInternal,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updatedAction.updated_at,
    originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at must be greater than or equal to created_at",
    new Date(updatedAction.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
