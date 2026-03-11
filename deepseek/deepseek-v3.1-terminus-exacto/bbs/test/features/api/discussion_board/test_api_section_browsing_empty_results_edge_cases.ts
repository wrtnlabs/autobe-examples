import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test edge cases for section browsing including empty search results and boundary conditions.
 * 1. Guest session establishment
 * 2. Empty search results with non-matching terms
 * 3. Limit value boundary testing (min=1, max=100)
 * 4. Sorting with empty results
 */
export async function test_api_section_browsing_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // 2. Test empty search results with non-matching term
  const emptySearchResult =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        search: "xyz_nonexistent_section_abc_123",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search results",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "total records for empty search",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages for empty search",
    emptySearchResult.pagination.pages,
    0,
  );
  // 3. Test minimum limit boundary (1)
  const minLimitResult =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        limit: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(minLimitResult);
  TestValidator.equals(
    "minimum limit should be 1",
    minLimitResult.pagination.limit,
    1,
  );
  // 4. Test maximum limit boundary (100)
  const maxLimitResult =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitResult.pagination.limit,
    100,
  );
  // 5. Test sorting with empty results
  const sortedEmptyResult =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        search: "completely_nonexistent_section_name",
        sort: "name:asc",
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sortedEmptyResult);
  TestValidator.equals(
    "sorted empty results should be empty",
    sortedEmptyResult.data.length,
    0,
  );
  // 6. Test error handling with invalid parameters
  await TestValidator.error("should handle invalid limit values", async () => {
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        limit: 0 as any, // Invalid limit that should trigger error
      } satisfies IDiscussionBoardSection.IRequest,
    });
  });
}
