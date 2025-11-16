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
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOnContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOnContent";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Ensure content details retrieval behaves consistently for non-content-scoped
 * moderation actions.
 *
 * Business intent:
 *
 * - Create a moderation action that is explicitly not content-scoped (e.g., scope
 *   = "user").
 * - Invoke the content-details endpoint for that action id.
 * - Verify that the endpoint returns a structurally valid payload whose embedded
 *   moderation_action header matches the original action (id, scope,
 *   action_type, reason fields), thereby confirming that no cross-linking or
 *   data corruption occurs when the action has no dedicated content
 *   specialization row.
 *
 * Steps:
 *
 * 1. Register an adminUser via /auth/adminUser/join to obtain an authenticated
 *    context.
 * 2. Create a moderation case via /communityPlatform/adminUser/moderationCases.
 * 3. Create an account restriction episode via
 *    /communityPlatform/adminUser/accountRestrictions.
 * 4. Create a moderation action via /communityPlatform/adminUser/moderationActions
 *    with:
 *
 *    - Moderation_case_id from step 2
 *    - Account_restriction_id from step 3
 *    - Scope set to a non-content value such as "user"
 * 5. Call GET
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}/content
 *    using the id from step 4.
 * 6. Assert that the response is a valid
 *    ICommunityPlatformModerationActionOnContent.IInvert and that:
 *
 *    - Response.moderation_action.id === originalAction.id
 *    - Response.moderation_action.scope === originalAction.scope (e.g., "user")
 *    - Response.moderation_action.action_type === originalAction.action_type
 *    - Response.moderation_action.reason_category === originalAction.reason_category
 *    - Response.moderation_action.reason_detail matches originalAction.reason_detail
 * 7. Optionally assert that the target_post, target_comment, and community fields
 *    are either populated or null/undefined, but do not enforce specific
 *    presence because the backend behavior for non-content-scoped actions is
 *    not fully specified in the SDK.
 */
export async function test_api_moderation_action_content_not_found_for_non_content_action(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case.
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "medium",
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

  // 3. Create an account restriction episode.
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const restrictionBody = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt as string & tags.Format<"date-time">,
    ends_at: endsAt as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(restriction);

  // 4. Create a non-content-scoped moderation action (scope = "user").
  const scopeValue = "user";
  const actionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: scopeValue,
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: actionBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action scope should match non-content scope",
    moderationAction.scope,
    scopeValue,
  );

  // 5. Call content-details endpoint for this non-content-scoped action.
  const contentDetails: ICommunityPlatformModerationActionOnContent.IInvert =
    await api.functional.communityPlatform.adminUser.moderationActions.content.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(contentDetails);

  // 6. Validate that the embedded moderation_action header matches the original.
  const embedded = contentDetails.moderation_action;
  typia.assert<ICommunityPlatformModerationAction>(embedded);

  TestValidator.equals(
    "embedded moderation_action id matches original",
    embedded.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "embedded moderation_action scope matches original non-content scope",
    embedded.scope,
    moderationAction.scope,
  );
  TestValidator.equals(
    "embedded moderation_action action_type matches original",
    embedded.action_type,
    moderationAction.action_type,
  );
  TestValidator.equals(
    "embedded moderation_action reason_category matches original",
    embedded.reason_category,
    moderationAction.reason_category,
  );
  TestValidator.equals(
    "embedded moderation_action reason_detail matches original",
    embedded.reason_detail ?? null,
    moderationAction.reason_detail ?? null,
  );

  // 7. Loosely verify that content-related associations are structurally valid
  // but without enforcing their presence/absence semantics.
  if (contentDetails.target_post != null) {
    typia.assert<ICommunityPlatformPost.ISummary>(contentDetails.target_post);
  }
  if (contentDetails.target_comment != null) {
    typia.assert<ICommunityPlatformComment.ISummary>(
      contentDetails.target_comment,
    );
  }
  if (contentDetails.community != null) {
    typia.assert<ICommunityPlatformCommunity.ISummary>(
      contentDetails.community,
    );
  }
}
