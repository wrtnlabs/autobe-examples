import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoFilterSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoFilterSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoFilterSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_filter_settings_create } from "../../../generate/generate_random_multi_user_todo_member_filter_settings_create";
import { prepare_random_multi_user_todo_todo_filter_setting } from "../../../prepare/prepare_random_multi_user_todo_todo_filter_setting";

/**
 * Test the search functionality for filter configurations by name pattern matching.
 * This scenario validates that a member can search for specific filter configurations
 * using partial name matching. Create multiple filter configurations with different
 * names, then test searching with various patterns to verify the LIKE-based search
 * works correctly.
 */
export async function test_api_filter_settings_search_by_name_pattern(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create multiple filter configurations with different names
  const filterNames = [
    "Dashboard Filter",
    "Homepage Filter",
    "Admin Dashboard Filter",
    "Mobile Filter",
    "Desktop Filter",
    "Default Filter",
  ];
  const createdFilters: IMultiUserTodoTodoFilterSetting[] = [];
  for (const name of filterNames) {
    const filterType = RandomGenerator.pick([
      "completion_status",
      "date_range",
      "priority",
    ] as const);
    const isDefault = RandomGenerator.pick([true, false] as const);
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name,
            filter_type: filterType,
            is_default: isDefault,
          },
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Test 1: Empty search term - should return all filters
  const emptySearchResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns all filters",
    emptySearchResponse.data.length,
    createdFilters.length,
  );
  // Test 2: Exact match search
  const exactMatchResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "Dashboard Filter",
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(exactMatchResponse);
  TestValidator.equals(
    "exact match returns 1 item",
    exactMatchResponse.data.length,
    1,
  );
  TestValidator.equals(
    "exact match has correct name",
    exactMatchResponse.data[0].name,
    "Dashboard Filter",
  );
  // Test 3: Partial match (case-insensitive LIKE '%dashboard%')
  const partialMatchResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "dashboard",
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(partialMatchResponse);
  TestValidator.predicate(
    "partial match returns at least 2 items",
    partialMatchResponse.data.length >= 2,
  );
  // Verify all returned items contain "dashboard" in name (case-insensitive)
  for (const item of partialMatchResponse.data) {
    TestValidator.predicate(
      `item "${item.name}" contains search term`,
      item.name.toLowerCase().includes("dashboard"),
    );
  }
  // Test 4: Search for common term present in all names
  const commonTermResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "filter",
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(commonTermResponse);
  TestValidator.equals(
    "common term 'filter' returns all items",
    commonTermResponse.data.length,
    createdFilters.length,
  );
  // Test 5: No match search
  const noMatchResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "nonexistentpattern12345",
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match returns empty array",
    noMatchResponse.data.length,
    0,
  );
  // Test 6: Pagination with filtered results
  const paginatedResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "filter",
          limit: 2 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination returns correct page size",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginatedResponse.pagination.current === 1 &&
      paginatedResponse.pagination.limit === 2 &&
      paginatedResponse.pagination.records === createdFilters.length &&
      paginatedResponse.pagination.pages ===
        Math.ceil(createdFilters.length / 2),
  );
  // Test 7: Mixed search with filter_type
  const mixedSearchResponse =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          search: "dashboard",
          filter_type: createdFilters[0].filter_type,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(mixedSearchResponse);
  // All returned items should match both criteria
  for (const item of mixedSearchResponse.data) {
    TestValidator.predicate(
      `item matches search term and filter type`,
      item.name.toLowerCase().includes("dashboard") &&
        item.filter_type === createdFilters[0].filter_type,
    );
  }
}
