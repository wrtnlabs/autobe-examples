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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Verify reverted filter behavior when searching moderation actions.
 *
 * Business goal: Ensure that administrative tooling can distinguish between
 * still-effective and reverted moderation actions by using the `reverted` flag
 * in the moderation actions search endpoint.
 *
 * High level steps
 *
 * 1. Join an adminUser to obtain an authenticated admin session.
 * 2. Create a new moderation case as that admin.
 * 3. Perform a baseline search for moderation actions scoped to that case without
 *    specifying `reverted`, to observe existing actions (if any).
 * 4. Call the search endpoint with `reverted: true` for the same moderationCaseId
 *    and verify that:
 *
 *    - Every returned action has non-null `reverted_at`.
 * 5. Call the search endpoint with `reverted: false` for the same moderationCaseId
 *    and verify that:
 *
 *    - Every returned action has `reverted_at` === null.
 *    - No action id appears in both reverted and non-reverted result sets.
 * 6. When the baseline search produces no actions for the case, verify that both
 *    reverted=true and reverted=false queries return empty data arrays and
 *    pagination metadata is consistent with empty results.
 */
export async function test_api_moderation_actions_search_reverted_flag(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and obtain authorized context
  const adminJoinRequest =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a moderation case as this admin
  const createCaseBody =
    typia.random<ICommunityPlatformModerationCase.ICreate>();

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createCaseBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(moderationCase);

  // Basic sanity check for created case
  TestValidator.predicate(
    "created moderation case has non-empty id",
    moderationCase.id.length > 0,
  );

  // Helper to search actions for this case with a given reverted flag
  const searchForReverted = async (
    reverted: boolean | null | undefined,
  ): Promise<IPageICommunityPlatformModerationAction.ISummary> => {
    const body = {
      page: 1 as number & tags.Type<"int32">,
      pageSize: 50 as number & tags.Type<"int32">,
      moderationCaseId: moderationCase.id,
      reverted,
    } satisfies ICommunityPlatformModerationAction.IRequest;

    const page: IPageICommunityPlatformModerationAction.ISummary =
      await api.functional.communityPlatform.adminUser.moderation.search.actions.index(
        connection,
        { body },
      );
    typia.assert<IPageICommunityPlatformModerationAction.ISummary>(page);
    return page;
  };

  // 3. Baseline search without reverted filter (reverted = null)
  const baselinePage = await searchForReverted(null);

  const baselineIds = baselinePage.data.map((a) => a.id);

  // Validate baseline pagination invariants
  TestValidator.predicate(
    "baseline pagination current is non-negative",
    baselinePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline pagination limit is non-negative",
    baselinePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline data length does not exceed limit when limit > 0",
    baselinePage.pagination.limit === 0 ||
      baselinePage.data.length <= baselinePage.pagination.limit,
  );

  // 4. Search for reverted actions only
  const revertedPage = await searchForReverted(true);

  // 5. Search for non-reverted actions only
  const nonRevertedPage = await searchForReverted(false);

  // Validate revertedPage invariants: all returned actions have non-null reverted_at
  for (const action of revertedPage.data) {
    TestValidator.predicate(
      "reverted=true search returns only actions with non-null reverted_at",
      action.reverted_at !== null && action.reverted_at !== undefined,
    );
  }

  // Validate nonRevertedPage invariants: all returned actions have null reverted_at
  for (const action of nonRevertedPage.data) {
    TestValidator.predicate(
      "reverted=false search returns only actions with null reverted_at",
      action.reverted_at === null || action.reverted_at === undefined,
    );
  }

  // Ensure there is no overlap of ids between reverted and non-reverted sets
  const revertedIds = new Set(revertedPage.data.map((a) => a.id));
  const nonRevertedIds = new Set(nonRevertedPage.data.map((a) => a.id));

  for (const id of revertedIds) {
    TestValidator.predicate(
      "no action id appears in both reverted and non-reverted results",
      nonRevertedIds.has(id) === false,
    );
  }

  // If baseline has actions, ensure reverted-filtered pages are subsets of baseline
  if (baselineIds.length > 0) {
    const baselineIdSet = new Set(baselineIds);

    for (const action of revertedPage.data) {
      TestValidator.predicate(
        "reverted=true results are subset of baseline results (when baseline non-empty)",
        baselineIdSet.has(action.id),
      );
    }

    for (const action of nonRevertedPage.data) {
      TestValidator.predicate(
        "reverted=false results are subset of baseline results (when baseline non-empty)",
        baselineIdSet.has(action.id),
      );
    }
  } else {
    // When no baseline actions, both reverted=true and reverted=false should be empty or at least not contradict baseline emptiness
    TestValidator.predicate(
      "when baseline has no actions, reverted=true search should not return actions",
      revertedPage.data.length === 0,
    );
    TestValidator.predicate(
      "when baseline has no actions, reverted=false search should not return actions",
      nonRevertedPage.data.length === 0,
    );
  }
}
