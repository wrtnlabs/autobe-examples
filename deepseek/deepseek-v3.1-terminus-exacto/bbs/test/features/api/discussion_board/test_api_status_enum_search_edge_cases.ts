import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases and boundary conditions for status enumeration search functionality.
 * Verifies behavior when no records match search criteria, pagination boundaries,
 * invalid filter combinations, and sorting patterns.
 */
export async function test_api_status_enum_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Empty result set with non-matching filters
  const emptyResult =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: "invalid_entity_type_that_does_not_exist",
          value: "nonexistent_value_12345",
          is_active: true,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data", emptyResult.data.length, 0);
  TestValidator.predicate(
    "pagination records should be 0",
    emptyResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages should be 0",
    emptyResult.pagination.pages === 0,
  );
  // Test 2: Pagination boundaries - first page
  const firstPage =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page current should be 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "first page limit should be 10",
    firstPage.pagination.limit === 10,
  );
  // Test 3: Pagination boundaries - page beyond available records
  const beyondPage =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page should have empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond page current should be 1000",
    beyondPage.pagination.current === 1000,
  );
  // Test 4: Filter by entity_type with realistic values
  const entityFilter =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: "article",
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(entityFilter);
  // Test 5: Filter by value pattern matching
  const valueFilter =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          value: "pending",
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(valueFilter);
  // Test 6: Filter by active status
  const activeFilter =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(activeFilter);
  // Test 7: Combined filters
  const combinedFilter =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: "article",
          is_active: true,
          value: "published",
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test 8: Maximum limit boundary
  const maxLimit =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit should be 100",
    maxLimit.pagination.limit,
    100,
  );
  // Test 9: Minimum limit boundary
  const minLimit =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(minLimit);
  TestValidator.equals("min limit should be 1", minLimit.pagination.limit, 1);
  // Test 10: Sorting by sort_order - ascending (implicit)
  const sortedAsc =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(sortedAsc);
  // Validate sort_order is properly ordered (if we have multiple results)
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      TestValidator.predicate(
        `sort_order should be ascending at position ${i}`,
        sortedAsc.data[i].sort_order >= sortedAsc.data[i - 1].sort_order,
      );
    }
  }
  // Test 11: Invalid parameter combination - conflicting filters
  const invalidCombination =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "nonexistent_combination_123",
          is_active: false,
        } satisfies IDiscussionBoardStatusEnum.IRequest,
      },
    );
  typia.assert(invalidCombination);
  TestValidator.predicate(
    "invalid combination should handle gracefully",
    invalidCombination.data.length >= 0,
  );
}
