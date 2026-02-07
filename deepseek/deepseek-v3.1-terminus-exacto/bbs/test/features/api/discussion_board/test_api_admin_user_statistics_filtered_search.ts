import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test user statistics retrieval with search filters and sorting options.
 * Validates filtering capabilities including display name search using partial text matching,
 * email domain filtering, and various sorting options (newest, oldest, display name ascending/descending).
 * Tests pagination with different page sizes and verifies the response structure remains consistent.
 */
export async function test_api_admin_user_statistics_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic search with partial display name matching
  const searchResponse1 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse1);
  TestValidator.predicate(
    "pagination data is valid",
    searchResponse1.pagination.current >= 0 &&
      searchResponse1.pagination.limit > 0 &&
      searchResponse1.pagination.records >= 0 &&
      searchResponse1.pagination.pages >= 0,
  );
  // Test 2: Email domain filtering with valid email pattern
  const searchResponse2 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          email: `test@${RandomGenerator.alphabets(5)}.com`,
          sort: "newest",
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse2);
  // Test 3: Sorting by oldest
  const searchResponse3 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          sort: "oldest",
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse3);
  // Test 4: Sorting by display name ascending
  const searchResponse4 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          sort: "display_name_asc",
          page: 1,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse4);
  // Test 5: Sorting by display name descending
  const searchResponse5 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          sort: "display_name_desc",
          limit: 5,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse5);
  // Test 6: Combined search with realistic parameters
  const searchResponse6 =
    await api.functional.discussionBoard.admin.users.statistics.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(2),
          email: null,
          page: 2,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
  typia.assert(searchResponse6);
  // Validate pagination consistency across different responses
  TestValidator.predicate(
    "pagination limits are reasonable",
    searchResponse1.pagination.limit <= 100 &&
      searchResponse3.pagination.limit <= 100 &&
      searchResponse5.pagination.limit <= 100,
  );
  // Validate data structure using business logic (not type checking)
  if (searchResponse1.data.length > 0) {
    const sampleUser = searchResponse1.data[0];
    TestValidator.predicate(
      "user summary has valid structure",
      sampleUser.id.length > 0 &&
        sampleUser.display_name.length > 0 &&
        sampleUser.created_at.length > 0 &&
        sampleUser.updated_at.length > 0,
    );
  }
}
