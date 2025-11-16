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
 * Validate that an authenticated adminUser can search moderation actions using
 * basic filters for moderationCaseId and accountRestrictionId.
 *
 * Business flow:
 *
 * 1. Admin joins to obtain an authorized adminUser context.
 * 2. Admin creates a moderation case with a unique case_key, title, status, and
 *    priority.
 * 3. Admin creates an account restriction episode with concrete account_type,
 *    scope, reason_category, and starts/ends_at window.
 * 4. Admin records at least one moderation action header linked to the moderation
 *    case and account restriction.
 * 5. Admin searches moderation actions through PATCH
 *    /communityPlatform/adminUser/moderationActions using a request body that
 *    filters by moderationCaseId and accountRestrictionId and provides
 *    pagination parameters.
 * 6. The response page must contain the created moderation action summary with
 *    matching action_type, scope, reason_category, and linked moderation_case
 *    and account_restriction summaries.
 * 7. Pagination metadata must be consistent with the number of created actions
 *    (e.g., records/pages reflect at least the single matching action while
 *    remaining robust if other records exist).
 */
export async function test_api_moderation_actions_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case
  const caseKey = `case-${RandomGenerator.alphaNumeric(8)}`;
  const moderationCaseCreate = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminAuthorized.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseCreate,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  TestValidator.equals(
    "created moderation case should have matching case_key",
    moderationCase.case_key,
    caseKey,
  );

  // 3. Create an account restriction episode
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const accountRestrictionCreate = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: accountRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(accountRestriction);

  TestValidator.equals(
    "created account restriction should have matching account_type",
    accountRestriction.account_type,
    accountRestrictionCreate.account_type,
  );
  TestValidator.equals(
    "created account restriction should have matching scope",
    accountRestriction.scope,
    accountRestrictionCreate.scope,
  );
  TestValidator.equals(
    "created account restriction should have matching reason_category",
    accountRestriction.reason_category,
    accountRestrictionCreate.reason_category,
  );

  // 4. Create at least one moderation action header linked to case and restriction
  const actionType = "restrict_account";
  const scope = "user";
  const reasonCategory = "policy_violation";

  const moderationActionCreate = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: actionType,
    scope,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionCreate,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(createdAction);

  TestValidator.equals(
    "created moderation action should have matching action_type",
    createdAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "created moderation action should have matching scope",
    createdAction.scope,
    scope,
  );
  TestValidator.equals(
    "created moderation action should have matching reason_category",
    createdAction.reason_category,
    reasonCategory,
  );

  // 5. Search moderation actions with filters and pagination
  const searchRequest = {
    page: 1,
    pageSize: 10,
    moderationCaseId: moderationCase.id,
    actorAdminuserId: undefined,
    accountRestrictionId: accountRestriction.id,
    actionTypes: [actionType],
    scopes: [scope],
    reasonCategories: [reasonCategory],
    createdAtFrom: null,
    createdAtTo: null,
    reverted: null,
    includeDeleted: false,
    searchText: undefined,
    sortByCreatedAt: "desc",
    sortBySeverity: null,
  } satisfies ICommunityPlatformModerationAction.IRequest;

  const page: IPageICommunityPlatformModerationAction.ISummary =
    await api.functional.communityPlatform.adminUser.moderationActions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageICommunityPlatformModerationAction.ISummary>(page);

  const { pagination, data } = page;

  // 6. Verify that the page contains the created moderation action summary
  TestValidator.predicate(
    "search results should contain at least one moderation action",
    data.length > 0,
  );

  const matched = data.find((summary) => summary.id === createdAction.id);

  await TestValidator.predicate(
    "search results should include the created moderation action",
    async () => matched !== undefined,
  );

  if (matched) {
    TestValidator.equals(
      "matched summary should have matching action_type",
      matched.action_type,
      actionType,
    );
    TestValidator.equals(
      "matched summary should have matching scope",
      matched.scope,
      scope,
    );
    TestValidator.equals(
      "matched summary should have matching reason_category",
      matched.reason_category,
      reasonCategory,
    );

    TestValidator.equals(
      "matched summary moderation_case.id should equal created case id",
      matched.moderation_case.id,
      moderationCase.id,
    );

    if (matched.account_restriction) {
      TestValidator.equals(
        "matched summary account_restriction.id should equal created restriction id",
        matched.account_restriction.id,
        accountRestriction.id,
      );
    } else {
      throw new Error(
        "Expected account_restriction summary to be present for created moderation action",
      );
    }
  }

  // 7. Validate pagination metadata is consistent
  TestValidator.predicate(
    "pagination current page should equal requested page",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be at least the number of returned records",
    pagination.limit >= data.length,
  );
  TestValidator.predicate(
    "pagination records should be at least the number of returned records",
    pagination.records >= data.length,
  );
}
