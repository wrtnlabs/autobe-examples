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
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnCommunity";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Validate that an authenticated adminUser can retrieve a community-targeted
 * moderation action view including its linked account restriction.
 *
 * Business flow:
 *
 * 1. Join as an adminUser to obtain authorized admin context.
 * 2. Open a moderation case that will own subsequent moderation actions.
 * 3. Register an account restriction episode that will be linked to the action.
 * 4. Create a moderation action header scoped to "community", referencing the
 *    moderation case and the created account restriction.
 * 5. Fetch the community-targeted moderation action view by moderationActionId and
 *    verify structural and linkage integrity.
 *
 * Assertions:
 *
 * - Response conforms to ICommunityPlatformModerationActionOnCommunity.
 * - Moderation_action.id equals the created action id.
 * - Moderation_action.action_type, scope, reason_category, reason_detail match
 *   the creation payload.
 * - Target_community_id equals target_community.id.
 * - Created_at is a non-empty ISO datetime string; deleted_at is null.
 * - Moderation_action.account_restriction is non-null and its id matches the
 *   restriction.id from creation.
 */
export async function test_api_admin_moderation_action_community_view_with_account_restriction(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to get authorized context
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case
  const moderationCaseBody =
    typia.random<ICommunityPlatformModerationCase.ICreate>();
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // 3. Create an account restriction episode
  const restrictionBody =
    typia.random<ICommunityPlatformAccountRestriction.ICreate>();
  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restriction);

  // 4. Create a moderation action header scoped to community and linked to restriction
  const actionCreateBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_community_access",
    scope: "community",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 5. Fetch community-targeted moderation action view
  const view: ICommunityPlatformModerationActionOnCommunity =
    await api.functional.communityPlatform.adminUser.moderationActions.community.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert<ICommunityPlatformModerationActionOnCommunity>(view);

  // 6. Structural and linkage validations
  const header = view.moderation_action;
  TestValidator.equals(
    "moderation action id must match",
    header.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action_type must match creation payload",
    header.action_type,
    actionCreateBody.action_type,
  );
  TestValidator.equals(
    "scope must be community",
    header.scope,
    actionCreateBody.scope,
  );
  TestValidator.equals(
    "reason_category must match",
    header.reason_category,
    actionCreateBody.reason_category,
  );
  TestValidator.equals(
    "reason_detail must match",
    header.reason_detail ?? null,
    actionCreateBody.reason_detail ?? null,
  );

  // target_community_id and summary consistency
  TestValidator.equals(
    "target_community_id equals target_community.id",
    view.target_community_id,
    view.target_community.id,
  );

  // created_at present and deleted_at null
  await TestValidator.predicate(
    "created_at must be non-empty",
    async () =>
      typeof view.created_at === "string" && view.created_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at must be null for active specialization",
    view.deleted_at ?? null,
    null,
  );

  // account_restriction linkage when provided
  TestValidator.predicate(
    "moderation_action.account_restriction must exist",
    header.account_restriction !== undefined &&
      header.account_restriction !== null,
  );
  if (header.account_restriction) {
    TestValidator.equals(
      "linked account_restriction id must match",
      header.account_restriction.id,
      restriction.id,
    );
  }
}
