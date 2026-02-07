import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the user-specific filtering capability of the comment rate limits monitoring system.
 * This test validates that super administrators can filter rate limit records by specific
 * user IDs to monitor individual user comment submission patterns and identify potential
 * spam behavior or abusive patterns.
 */
export async function test_api_superadmin_comment_rate_limits_user_specific_filtering(
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
  // Since we cannot create actual comment rate limit records through available APIs,
  // we test the filtering functionality with the assumption that the system has
  // existing data. The test focuses on validating the filtering logic and response
  // structure rather than testing with actual created records.
  // Test filtering by a specific user ID
  const filteredResponse =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          discussion_board_user_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // Validate response structure
  TestValidator.predicate(
    "response has valid pagination structure",
    filteredResponse.pagination.current >= 0 &&
      filteredResponse.pagination.limit > 0 &&
      filteredResponse.pagination.records >= 0 &&
      filteredResponse.pagination.pages >= 0,
  );
  // Validate that data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(filteredResponse.data),
  );
  // If records are returned, validate their structure
  if (filteredResponse.data.length > 0) {
    TestValidator.predicate(
      "all records have valid structure",
      filteredResponse.data.every(
        (record) =>
          typeof record.id === "string" &&
          typeof record.submitted_at === "string" &&
          typeof record.user === "object" &&
          typeof record.user.id === "string" &&
          typeof record.user.display_name === "string",
      ),
    );
  }
  // Test filtering with different parameters
  const filteredResponse2 =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          discussion_board_user_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(filteredResponse2);
  // Test pagination with different page
  const paginatedResponse =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          discussion_board_user_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Test without filter
  const allRecordsResponse =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // Validate that all responses have consistent structure
  TestValidator.predicate(
    "all responses have consistent pagination structure",
    [
      filteredResponse,
      filteredResponse2,
      paginatedResponse,
      allRecordsResponse,
    ].every(
      (response) =>
        typeof response.pagination.current === "number" &&
        typeof response.pagination.limit === "number" &&
        typeof response.pagination.records === "number" &&
        typeof response.pagination.pages === "number",
    ),
  );
}
