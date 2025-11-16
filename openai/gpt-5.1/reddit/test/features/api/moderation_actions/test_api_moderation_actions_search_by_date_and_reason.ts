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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Search moderation actions by created_at range and reasonCategories filters.
 *
 * Business goals:
 *
 * - Confirm that adminUser-authenticated search endpoint correctly filters by
 *   created_at date window and reasonCategories.
 * - Verify that sortByCreatedAt affects ordering of results.
 * - Ensure non-matching actions (outside time window or with other
 *   reason_category) are excluded from results.
 *
 * Scenario steps:
 *
 * 1. Join as a new adminUser via /auth/adminUser/join to get an authorized context
 *    for communityPlatform-admin APIs.
 * 2. Create a moderation case to which all test moderation actions will be
 *    attached.
 * 3. Create an optional account restriction episode for richer context; at least
 *    one moderation action will reference this restriction.
 * 4. Create several moderation actions (3–4) with controlled semantics:
 *
 *    - All actions share the same moderation_case_id.
 *    - At least two actions use reason_category = "spam".
 *    - At least one action uses another reason_category, e.g., "harassment".
 *    - Use action_type/scope arbitrary strings like "warn_user"/"user" or
 *         "remove_content"/"content".
 *    - Creation timestamps are automatically set by the backend, so we will
 *         approximate a date window based on when we call the search endpoint,
 *         but we can still reason that all actions created in this test fall
 *         within a tight window (e.g., now ± small delta).
 * 5. Compute a created_at window:
 *
 *    - Since we cannot set created_at manually, we will: a. Call the search endpoint
 *         once with no filters to get all actions for the case and inspect
 *         their created_at values. b. Derive createdAtFrom/createdAtTo from the
 *         spam actions’ created_at timestamps so that the window only contains
 *         those spam actions but excludes at least one non-spam action.
 *    - However, the index endpoint currently only filters by absolute timestamps,
 *         not by case, so instead we keep the test self-contained by not trying
 *         to isolate from pre-existing data. We instead:
 *
 *         - Use a window that certainly includes all newly created actions by using
 *                   Date.now() just before creation as lower bound and
 *                   Date.now() after the last creation as upper bound,
 *                   converted to ISO strings.
 *         - Accept that pre-existing actions (if any) in that short window might also
 *                   appear; we only assert that all returned items match the
 *                   reasonCategories filter and fall within the window, not
 *                   that the set is exactly equal to our created actions.
 * 6. Call PATCH /communityPlatform/adminUser/moderationActions.index with:
 *
 *    - ReasonCategories: ["spam"].
 *    - CreatedAtFrom/createdAtTo from the measured window that covers our new
 *         actions.
 *    - SortByCreatedAt: "desc".
 *    - Page: 1, pageSize: a generous value (e.g., 50).
 * 7. Validate response:
 *
 *    - Typia.assert on the page result.
 *    - For every item in data:
 *
 *         - Reason_category must be "spam".
 *         - Created_at must be within [createdAtFrom, createdAtTo].
 *    - If there are at least 2 items, assert ordering by created_at desc.
 *
 * Note: We do not assert that only our actions are returned because the system
 * may contain other spam actions in the same time window from other tests.
 */
export async function test_api_moderation_actions_search_by_date_and_reason(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to get authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-Admin",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case owned by this admin
  const caseBody = {
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
        body: caseBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Optionally create an account restriction episode
  const restrictionStartsAt = new Date();
  const restrictionEndsAt = new Date(
    restrictionStartsAt.getTime() + 60 * 60 * 1000,
  ); // +1 hour

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: restrictionStartsAt.toISOString(),
    ends_at: restrictionEndsAt.toISOString(),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(accountRestriction);

  // Establish a lower bound timestamp just before creating moderation actions
  const createdWindowStart = new Date();
  const createdAtFrom = new Date(
    createdWindowStart.getTime() - 5 * 1000,
  ).toISOString(); // 5 seconds earlier buffer

  // 4. Create several moderation actions
  const spamActionBody1 = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const spamAction1: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: spamActionBody1,
      },
    );
  typia.assert(spamAction1);

  const spamActionBody2 = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "warn_user",
    scope: "user",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const spamAction2: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: spamActionBody2,
      },
    );
  typia.assert(spamAction2);

  const otherReasonBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "remove_content",
    scope: "content",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const otherAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: otherReasonBody,
      },
    );
  typia.assert(otherAction);

  const createdWindowEnd = new Date();
  const createdAtTo = new Date(
    createdWindowEnd.getTime() + 5 * 1000,
  ).toISOString();

  // 5. Search moderation actions in that window filtered by spam reason
  const searchBody = {
    page: 1,
    pageSize: 50,
    moderationCaseId: moderationCase.id,
    actorAdminuserId: undefined,
    accountRestrictionId: undefined,
    actionTypes: undefined,
    scopes: undefined,
    reasonCategories: ["spam"],
    createdAtFrom,
    createdAtTo,
    reverted: null,
    includeDeleted: null,
    searchText: undefined,
    sortByCreatedAt: "desc",
    sortBySeverity: null,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const searchResult: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.adminUser.moderationActions.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  const page = searchResult.pagination;
  const records = searchResult.data;

  // Basic pagination sanity
  TestValidator.predicate(
    "pagination current page should be 1",
    page.current === 1,
  );

  // 6. Validate all returned items match spam reason and created_at window
  for (const item of records) {
    TestValidator.equals(
      "reason_category must be spam when filtering by reasonCategories",
      item.reason_category,
      "spam",
    );

    TestValidator.predicate(
      "created_at must be >= createdAtFrom",
      item.created_at >= createdAtFrom,
    );
    TestValidator.predicate(
      "created_at must be <= createdAtTo",
      item.created_at <= createdAtTo,
    );
  }

  // 7. If at least two items, ensure sortByCreatedAt desc ordering
  if (records.length >= 2) {
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      TestValidator.predicate(
        "records must be ordered by created_at desc",
        prev.created_at >= curr.created_at,
      );
    }
  }
}
