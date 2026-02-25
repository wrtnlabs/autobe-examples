import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test user list retrieval with default pagination settings.
 *
 * This test validates:
 * - API returns properly structured paginated response
 * - Pagination defaults: current=1, limit=20
 * - Public access works without authentication
 */
export async function test_api_user_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Call API with empty request body (default pagination)
  const response = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure and defaults
  TestValidator.equals("default current page", response.pagination.current, 1);
  TestValidator.equals("default limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
}
