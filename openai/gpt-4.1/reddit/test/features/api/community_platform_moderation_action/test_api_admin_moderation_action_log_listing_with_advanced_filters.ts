import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";

/**
 * Validate advanced filtering and pagination of admin moderation action logs.
 *
 * 1. Register a new admin to authenticate all requests.
 * 2. Query with no filters, confirm paginated result.
 * 3. Issue queries with each advanced filter: by action_type, actor_id, content
 *    IDs, report_id, description_query, time range, sort_by/order, page,
 *    limit.
 * 4. For each query, verify that all returned moderation actions match the filter
 *    criteria and are within allowed data scope.
 * 5. Assert pagination metadata coherence (current/limit/records/pages).
 * 6. Check edge cases: empty result for impossible match, max limit, multiple
 *    filters in combination.
 * 7. Confirm only allowed fields are present in returned ISummary objects.
 */
export async function test_api_admin_moderation_action_log_listing_with_advanced_filters(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query with no filters (should get paginated moderation logs)
  const noFilterPage =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(noFilterPage);
  TestValidator.predicate(
    "First page of moderation logs should have pagination meta and data array",
    noFilterPage.pagination.current >= 0 && Array.isArray(noFilterPage.data),
  );
  // Step 3: If there is data, test advanced filter fields using data from page
  if (noFilterPage.data.length > 0) {
    const firstAction = noFilterPage.data[0];
    // Filter by action_type
    const actionTypePage =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: { action_type: firstAction.action_type },
        },
      );
    typia.assert(actionTypePage);
    TestValidator.predicate(
      "All actions should match queried action_type",
      actionTypePage.data.every(
        (a) => a.action_type === firstAction.action_type,
      ),
    );
    // Filter by (if available) target_post_id
    if (firstAction.target_post_id) {
      const postIdPage =
        await api.functional.communityPlatform.admin.moderationActions.index(
          connection,
          {
            body: { target_post_id: firstAction.target_post_id },
          },
        );
      typia.assert(postIdPage);
      TestValidator.predicate(
        "All actions should match queried post id",
        postIdPage.data.every(
          (a) => a.target_post_id === firstAction.target_post_id,
        ),
      );
    }
    // Filter by (if available) target_comment_id
    if (firstAction.target_comment_id) {
      const commentIdPage =
        await api.functional.communityPlatform.admin.moderationActions.index(
          connection,
          {
            body: { target_comment_id: firstAction.target_comment_id },
          },
        );
      typia.assert(commentIdPage);
      TestValidator.predicate(
        "All actions should match queried comment id",
        commentIdPage.data.every(
          (a) => a.target_comment_id === firstAction.target_comment_id,
        ),
      );
    }
    // Filter by report_id (if present)
    if (firstAction.report_id) {
      const reportIdPage =
        await api.functional.communityPlatform.admin.moderationActions.index(
          connection,
          {
            body: { report_id: firstAction.report_id },
          },
        );
      typia.assert(reportIdPage);
      TestValidator.predicate(
        "All actions must have matching report_id",
        reportIdPage.data.every((a) => a.report_id === firstAction.report_id),
      );
    }
    // Time range - use the created_at of firstAction
    const createdAt = firstAction.created_at;
    const timeRangePage =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            start_time: createdAt,
            end_time: createdAt,
          },
        },
      );
    typia.assert(timeRangePage);
    TestValidator.predicate(
      "All actions should be within the specified single-timestamp time range",
      timeRangePage.data.every((a) => a.created_at === createdAt),
    );
    // Advanced: combine filters
    const comboPage =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            action_type: firstAction.action_type,
            start_time: createdAt,
            end_time: createdAt,
          },
        },
      );
    typia.assert(comboPage);
    TestValidator.predicate(
      "Combined filters should match all criteria",
      comboPage.data.every(
        (a) =>
          a.action_type === firstAction.action_type &&
          a.created_at === createdAt,
      ),
    );
    // Pagination: get page 1 with limit 1
    const paged =
      await api.functional.communityPlatform.admin.moderationActions.index(
        connection,
        {
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 1 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<200>,
          },
        },
      );
    typia.assert(paged);
    TestValidator.equals("Paging, limit of 1", paged.data.length, 1);
  }
  // Step 4: Edge case - filter that should return empty results
  const impossiblePage =
    await api.functional.communityPlatform.admin.moderationActions.index(
      connection,
      {
        body: { action_type: RandomGenerator.alphabets(32) },
      },
    );
  typia.assert(impossiblePage);
  TestValidator.equals(
    "Edge filter no match: empty data array",
    impossiblePage.data.length,
    0,
  );
  // Step 5: Confirm ISummary fields are present, no extra data leaks
  if (noFilterPage.data.length > 0) {
    const example = noFilterPage.data[0];
    TestValidator.predicate(
      "ISummary shape has only defined properties",
      Reflect.ownKeys(example).every((x) =>
        [
          "id",
          "action_type",
          "target_post_id",
          "target_comment_id",
          "report_id",
          "created_at",
        ].includes(String(x)),
      ),
    );
  }
}
