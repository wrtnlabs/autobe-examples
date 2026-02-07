import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic moderation queue search functionality with pagination.
 * An administrator searches for moderation queue entries without any specific
 * filters to view the current moderation workload. The test verifies that the
 * system returns a paginated list of moderation queue entries with proper
 * pagination metadata and validates essential workflow information.
 */
export async function test_api_moderation_queue_basic_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Perform basic search without filters (default pagination)
  const searchResult =
    await api.functional.discussionBoard.admin.moderation_queue.index(
      adminConnection,
      {
        body: {}, // Empty request for basic search without filters
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination structure (business logic, not type validation)
  const { pagination, data } = searchResult;
  TestValidator.equals("pagination has current page", pagination.current, 1);
  TestValidator.predicate(
    "pagination has valid limit",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    pagination.pages >= 0,
  );
  // 4. Validate pagination calculation (business logic)
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination pages calculation",
    pagination.pages,
    expectedPages,
  );
  // 5. Validate each entry has essential workflow data (business logic)
  for (const entry of data) {
    TestValidator.predicate(
      "entry has valid workflow data",
      entry.id.length > 0 &&
        entry.moderation_status.length > 0 &&
        entry.priority_level.length > 0 &&
        typeof entry.auto_flagged === "boolean" &&
        entry.assignment_history_count >= 0 &&
        entry.content_flag_id.length > 0,
    );
  }
}
