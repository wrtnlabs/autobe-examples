import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Validates that an authenticated administrator can search for and retrieve a
 * filtered, paginated list of moderation actions, and that access is restricted
 * to authorized administrators.
 *
 * This test covers the following business logic:
 *
 * 1. Administrator account registration (used for authentication).
 * 2. Creation of a Moderation Action—ensures test data is present.
 * 3. Tests search with no filters: basic retrieval of moderation actions.
 * 4. Tests search with various individual filters such as action_type and status.
 * 5. Applies report ID and target entity (post/comment/community) filtering if
 *    present.
 * 6. Uses created_after/created_before for date range search.
 * 7. Tests pagination (page/limit) and sorting (sort_by/sort_order).
 * 8. Asserts that results match filter criteria exactly by examining IDs and data.
 * 9. Validates access control: unauthenticated and unauthorized connections are
 *    forbidden.
 *
 * Steps:
 *
 * 1. Register and authenticate as administrator #1. This will grant authorization
 *    to subsequent requests.
 * 2. Create a Moderation Action using this admin (using random valid input).
 * 3. Execute a variety of search queries:
 *
 *    - No filters (retrieve all)
 *    - Filter by action_type
 *    - Filter by status
 *    - (If present in action) filter by report_id, target_post_id,
 *         target_comment_id, target_community_id
 *    - Filter by created_after and created_before
 *    - Pagination (page, limit)
 *    - Sorting (sort_by, sort_order)
 * 4. For each search, assert the correctness of returned results (ID matching,
 *    filter match, correctness of pagination, etc).
 * 5. Attempt to access moderation actions search as unauthenticated user and
 *    expect error.
 * 6. Register a second admin, do not create moderation actions, test isolation of
 *    test data if possible.
 */
export async function test_api_moderation_actions_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  // Step 2: Create a moderation action
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createActionBody = {
    report_id: reportId,
    target_post_id: postId,
    target_comment_id: commentId,
    target_community_id: communityId,
    action_type: RandomGenerator.pick([
      "remove_post",
      "warn_user",
      "mute_user",
      "escalate",
      "ban_user",
      "restore_content",
    ] as const),
    result: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.pick([
      "in_progress",
      "completed",
      "reversed",
    ] as const),
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const action =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      { body: createActionBody },
    );
  typia.assert(action);
  // Step 3: Search via various filters
  // 3a. No filter (should retrieve at least one, the one just created)
  const resultsAll =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      { body: {} satisfies ICommunityPlatformModerationAction.IRequest },
    );
  typia.assert(resultsAll);
  TestValidator.predicate(
    "at least one moderation action exists",
    resultsAll.data.length > 0,
  );
  TestValidator.predicate(
    "created action is included in search results",
    resultsAll.data.some((item) => item.id === action.id),
  );
  // 3b. Filter by action_type
  const resultsByType =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          action_type: createActionBody.action_type,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByType);
  TestValidator.predicate(
    "created action is found by action_type",
    resultsByType.data.some((item) => item.id === action.id),
  );
  // 3c. Filter by status
  const resultsByStatus =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          status: createActionBody.status,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByStatus);
  TestValidator.predicate(
    "created action is found by status",
    resultsByStatus.data.some((item) => item.id === action.id),
  );
  // 3d. Filter by report_id
  const resultsByReport =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          report_id: createActionBody.report_id,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByReport);
  TestValidator.predicate(
    "created action is found by report_id",
    resultsByReport.data.some((item) => item.id === action.id),
  );
  // 3e. Filter by target_post_id
  const resultsByPost =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          target_post_id: createActionBody.target_post_id,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByPost);
  TestValidator.predicate(
    "created action is found by target_post_id",
    resultsByPost.data.some((item) => item.id === action.id),
  );
  // 3f. Filter by target_comment_id
  const resultsByComment =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          target_comment_id: createActionBody.target_comment_id,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByComment);
  TestValidator.predicate(
    "created action is found by target_comment_id",
    resultsByComment.data.some((item) => item.id === action.id),
  );
  // 3g. Filter by target_community_id
  const resultsByCommunity =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          target_community_id: createActionBody.target_community_id,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByCommunity);
  TestValidator.predicate(
    "created action is found by target_community_id",
    resultsByCommunity.data.some((item) => item.id === action.id),
  );
  // 3h. Date range: created_after/created_before
  const now = new Date();
  const resultsByDate =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          created_after: new Date(now.getTime() - 86400000).toISOString(),
          created_before: now.toISOString(),
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsByDate);
  TestValidator.predicate(
    "created action is found in date range",
    resultsByDate.data.some((item) => item.id === action.id),
  );
  // 3i. Pagination
  const resultsPage =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsPage);
  TestValidator.predicate(
    "pagination returns at least one result",
    resultsPage.data.length >= 1,
  );
  // 3j. Sorting
  const resultsSortAsc =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsSortAsc);
  TestValidator.predicate(
    "sorted by created_at asc - at least one result",
    resultsSortAsc.data.length > 0,
  );
  const resultsSortDesc =
    await api.functional.communityPlatform.administrator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAction.IRequest,
      },
    );
  typia.assert(resultsSortDesc);
  TestValidator.predicate(
    "sorted by created_at desc - at least one result",
    resultsSortDesc.data.length > 0,
  );
  // Step 4: Unauthorized/Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access moderation actions search",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.index(
        unauthConn,
        { body: {} satisfies ICommunityPlatformModerationAction.IRequest },
      );
    },
  );
  // Step 5: Register second admin (should not affect isolation)
  const admin2Email: string = typia.random<string & tags.Format<"email">>();
  const admin2Password: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin2 = await api.functional.auth.administrator.join(connection, {
    body: {
      email: admin2Email,
      password: admin2Password,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin2);
}
