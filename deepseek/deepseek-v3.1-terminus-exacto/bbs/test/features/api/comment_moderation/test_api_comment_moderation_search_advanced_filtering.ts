import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_comment_moderation_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super administrator
  const supervisorConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator using the utility function
  const authResult = await authorize_super_admin_join(supervisorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Set authorization header on the connection
  supervisorConnection.headers = {
    ...supervisorConnection.headers,
    Authorization: authResult.token.access,
  };
  // Test 1: Search with no filters (should return all)
  const allResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(allResults);
  // Test 2: Search with action type filter
  const actionTypeResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          action_type: "delete",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(actionTypeResults);
  // Test 3: Search with status filter
  const statusResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(statusResults);
  // Test 4: Search with reason text filter (partial match)
  const reasonResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          reason: "spam",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(reasonResults);
  // Test 5: Search with date range filter
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          created_at_from: oneWeekAgo,
          created_at_to: now,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(dateRangeResults);
  // Test 6: Search with combined filters
  const combinedResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          action_type: "edit",
          status: "pending",
          created_at_from: oneWeekAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(combinedResults);
  // Verify pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    allResults.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(allResults.data));
  TestValidator.predicate(
    "current page is valid",
    allResults.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", allResults.pagination.limit > 0);
  // Test 7: Empty result set handling
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResults =
    await api.functional.discussionBoard.superAdmin.comments.moderations.index(
      supervisorConnection,
      {
        body: {
          created_at_from: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty result set handled",
    emptyResults.data.length === 0,
  );
}
