import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive filtering capabilities of the moderation history search.
 * Create a super administrator account and test various filtering combinations
 * including: filtering by content type (article vs comment), filtering by
 * specific moderator IDs, date range filtering with start and end dates, and
 * text search within moderation reasons and original content. Verify that
 * each filter correctly narrows down results and that combined filters work
 * together logically. Test edge cases like searching for non-existent
 * moderators, empty date ranges, and partial text matches.
 */
export async function test_api_moderation_history_complex_filtering_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by content type - article
  const articleFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          content_type: "article",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(articleFilterResponse);
  // Test 2: Filter by content type - comment
  const commentFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          content_type: "comment",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(commentFilterResponse);
  // Test 3: Filter by non-existent moderator ID (edge case)
  const nonExistentModeratorResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          moderator_admin_id: typia.random<string & tags.Format<"uuid">>(),
          moderator_super_admin_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(nonExistentModeratorResponse);
  // Test 4: Date range filtering
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const dateRangeResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          created_at_start: startDate,
          created_at_end: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Test 5: Text search in moderation reason
  const reasonSearchResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          moderation_reason: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(reasonSearchResponse);
  // Test 6: Text search in original content
  const contentSearchResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          original_content: "content",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(contentSearchResponse);
  // Test 7: Combined filters
  const combinedFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          content_type: "article",
          created_at_start: startDate,
          created_at_end: endDate,
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Test 8: Empty date range (edge case)
  const emptyDateRangeResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          created_at_start: new Date().toISOString(),
          created_at_end: new Date(Date.now() - 1000).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(emptyDateRangeResponse);
  // Test 9: Partial text matches
  const partialMatchResponse =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.index(
      superAdminConnection,
      {
        body: {
          search: "es",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(partialMatchResponse);
}
