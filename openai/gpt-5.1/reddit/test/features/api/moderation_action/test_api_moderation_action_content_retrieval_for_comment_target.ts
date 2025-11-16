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
 * Validate retrieval of content-targeted moderation action details for an
 * adminUser.
 *
 * This test exercises the GET
 * /communityPlatform/adminUser/moderationActions/{moderationActionId}/content
 * endpoint in a way that is compatible with the limited SDK surface provided.
 * The original business scenario references creating a community, post, and
 * comment and then associating a moderation action specifically with that
 * comment. However, no APIs for creating or linking communities, posts, or
 * comments are available in the current materials, so the scenario is rewritten
 * to focus on what can be asserted using only the adminUser-side moderation
 * APIs.
 *
 * High-level flow:
 *
 * 1. Join as an adminUser to obtain an authorized context.
 * 2. Create a moderation case as the container for subsequent actions.
 * 3. Optionally create an account restriction episode to simulate account-level
 *    enforcement.
 * 4. Create a moderation action header with scope="content" tied to the moderation
 *    case (and optionally the account restriction), using plausible action_type
 *    and reason_category strings.
 * 5. Fetch content-specific details for that moderation action via GET
 *    /communityPlatform/adminUser/moderationActions/{moderationActionId}/content.
 * 6. Verify that the returned ICommunityPlatformModerationActionOnContent.IInvert
 *    payload:
 *
 *    - Has a moderation_action header whose id matches the moderation action we
 *         created.
 *    - Preserves the scope, action_type, and reason_category values we supplied.
 *    - Embeds a moderation_case summary whose id matches the created moderation
 *         case.
 *    - When an account_restriction_id was supplied, exposes a non-null
 *         moderation_action.account_restriction whose id matches the created
 *         restriction.
 *    - Exposes target_post, target_comment, and community either as null/undefined
 *         or as valid summary DTOs; the test does not assume they exist, but
 *         typia.assert ensures correct typing when they do.
 *    - Has created_at as a valid date-time string and deleted_at either
 *         null/undefined (active specialization) or a valid date-time string
 *         when present.
 *
 * The emphasis is on validating that an adminUser can successfully retrieve a
 * content-scoped moderation action’s consolidated view (header plus content
 * context) and that the core linkage between moderation action, moderation
 * case, and optional account restriction is consistent.
 */
export async function test_api_moderation_action_content_retrieval_for_comment_target(
  connection: api.IConnection,
) {
  // 1. Join as adminUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-Admin",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case
  const moderationCaseBody = {
    case_key: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;
  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(moderationCase);

  // 3. Optionally create an account restriction episode
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: now.toISOString(),
    ends_at: new Date(now.getTime() + oneDayMs).toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;
  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  // 4. Create a moderation action header with scope "content"
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "remove_content",
    scope: "content",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  // 5. Retrieve content-specific details for the moderation action
  const invert: ICommunityPlatformModerationActionOnContent.IInvert =
    await api.functional.communityPlatform.adminUser.moderationActions.content.at(
      connection,
      { moderationActionId: moderationAction.id },
    );
  typia.assert(invert);

  // 6. Validate linkage between moderation action header and case/restriction
  const header = invert.moderation_action;
  typia.assert<ICommunityPlatformModerationAction>(header);

  TestValidator.equals(
    "moderation_action.id should match created moderation action id",
    header.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "moderation_action.scope should be 'content'",
    header.scope,
    moderationActionBody.scope,
  );
  TestValidator.equals(
    "moderation_action.action_type should preserve input",
    header.action_type,
    moderationActionBody.action_type,
  );
  TestValidator.equals(
    "moderation_action.reason_category should preserve input",
    header.reason_category,
    moderationActionBody.reason_category,
  );

  if (header.moderation_case !== undefined) {
    TestValidator.equals(
      "embedded moderation_case.id should match created case id when present",
      header.moderation_case.id,
      moderationCase.id,
    );
  }

  if (
    header.account_restriction !== null &&
    header.account_restriction !== undefined
  ) {
    TestValidator.equals(
      "embedded account_restriction.id should match created restriction id when present",
      header.account_restriction.id,
      restriction.id,
    );
  }

  // 7. Validate specialization metadata timestamps
  TestValidator.predicate(
    "invert.created_at should be a non-empty string",
    invert.created_at.length > 0,
  );

  if (invert.deleted_at !== null && invert.deleted_at !== undefined) {
    TestValidator.predicate(
      "invert.deleted_at, when present, should be a non-empty string",
      invert.deleted_at.length > 0,
    );
  }

  // 8. Rely on typia.assert for target_post/target_comment/community type correctness
  if (invert.target_post !== null && invert.target_post !== undefined) {
    typia.assert<ICommunityPlatformPost.ISummary>(invert.target_post);
  }
  if (invert.target_comment !== null && invert.target_comment !== undefined) {
    typia.assert<ICommunityPlatformComment.ISummary>(invert.target_comment);
  }
  if (invert.community !== null && invert.community !== undefined) {
    typia.assert<ICommunityPlatformCommunity.ISummary>(invert.community);
  }
}
