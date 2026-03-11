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
 * Test advanced filtering capabilities by combining filter type and default status criteria.
 *
 * This test validates that a member can retrieve specific categories of filter configurations
 * by filter type and default status flags. We test various combinations: default filters only,
 * non-default filters only, specific filter types, and combinations of both criteria.
 */
export async function test_api_filter_settings_filter_by_type_and_default_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Define available filter types for testing
  const filterTypes = ["completion_status", "date_range", "priority"] as const;
  // Create multiple filter settings with different combinations
  const createdFilters: IMultiUserTodoTodoFilterSetting[] = [];
  // Create 2 default completion_status filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Default Completion ${i + 1}`,
            filter_type: "completion_status",
            is_default: true,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Create 2 non-default completion_status filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Non-default Completion ${i + 1}`,
            filter_type: "completion_status",
            is_default: false,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Create 2 default date_range filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Default Date Range ${i + 1}`,
            filter_type: "date_range",
            is_default: true,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Create 2 non-default date_range filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Non-default Date Range ${i + 1}`,
            filter_type: "date_range",
            is_default: false,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Create 2 default priority filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Default Priority ${i + 1}`,
            filter_type: "priority",
            is_default: true,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Create 2 non-default priority filters
  for (let i = 0; i < 2; i++) {
    const filter =
      await generate_random_multi_user_todo_member_filter_settings_create(
        memberConnection,
        {
          body: {
            name: `Non-default Priority ${i + 1}`,
            filter_type: "priority",
            is_default: false,
          } satisfies Partial<IMultiUserTodoTodoFilterSetting.ICreate>,
        },
      );
    typia.assert(filter);
    createdFilters.push(filter);
  }
  // Test 1: Get all default filters only
  const defaultFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          is_default: true,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(defaultFilters);
  // Validate only default filters are returned
  TestValidator.predicate(
    "all returned filters should be default",
    defaultFilters.data.every((filter) => filter.is_default === true),
  );
  // Count should match created default filters (2 of each type = 6 total)
  TestValidator.equals("default filters count", defaultFilters.data.length, 6);
  // Test 2: Get all non-default filters only
  const nonDefaultFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          is_default: false,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(nonDefaultFilters);
  // Validate only non-default filters are returned
  TestValidator.predicate(
    "all returned filters should be non-default",
    nonDefaultFilters.data.every((filter) => filter.is_default === false),
  );
  // Count should match created non-default filters (2 of each type = 6 total)
  TestValidator.equals(
    "non-default filters count",
    nonDefaultFilters.data.length,
    6,
  );
  // Test 3: Get filters by specific type only (completion_status)
  const completionStatusFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "completion_status",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(completionStatusFilters);
  // Validate all filters have the correct type
  TestValidator.predicate(
    "all filters should be completion_status type",
    completionStatusFilters.data.every(
      (filter) => filter.filter_type === "completion_status",
    ),
  );
  // Count should match created completion_status filters (2 default + 2 non-default = 4 total)
  TestValidator.equals(
    "completion_status filters count",
    completionStatusFilters.data.length,
    4,
  );
  // Test 4: Get filters by specific type only (date_range)
  const dateRangeFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "date_range",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(dateRangeFilters);
  // Validate all filters have the correct type
  TestValidator.predicate(
    "all filters should be date_range type",
    dateRangeFilters.data.every(
      (filter) => filter.filter_type === "date_range",
    ),
  );
  // Count should match created date_range filters (2 default + 2 non-default = 4 total)
  TestValidator.equals(
    "date_range filters count",
    dateRangeFilters.data.length,
    4,
  );
  // Test 5: Get filters by specific type only (priority)
  const priorityFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "priority",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(priorityFilters);
  // Validate all filters have the correct type
  TestValidator.predicate(
    "all filters should be priority type",
    priorityFilters.data.every((filter) => filter.filter_type === "priority"),
  );
  // Count should match created priority filters (2 default + 2 non-default = 4 total)
  TestValidator.equals(
    "priority filters count",
    priorityFilters.data.length,
    4,
  );
  // Test 6: Combined criteria - default completion_status filters
  const defaultCompletionFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "completion_status",
          is_default: true,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(defaultCompletionFilters);
  // Validate both criteria are satisfied
  TestValidator.predicate(
    "all filters should be completion_status and default",
    defaultCompletionFilters.data.every(
      (filter) =>
        filter.filter_type === "completion_status" &&
        filter.is_default === true,
    ),
  );
  // Count should match created default completion_status filters (2 total)
  TestValidator.equals(
    "default completion_status filters count",
    defaultCompletionFilters.data.length,
    2,
  );
  // Test 7: Combined criteria - non-default date_range filters
  const nonDefaultDateRangeFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "date_range",
          is_default: false,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(nonDefaultDateRangeFilters);
  // Validate both criteria are satisfied
  TestValidator.predicate(
    "all filters should be date_range and non-default",
    nonDefaultDateRangeFilters.data.every(
      (filter) =>
        filter.filter_type === "date_range" && filter.is_default === false,
    ),
  );
  // Count should match created non-default date_range filters (2 total)
  TestValidator.equals(
    "non-default date_range filters count",
    nonDefaultDateRangeFilters.data.length,
    2,
  );
  // Test 8: Search for non-existent filter type
  const nonExistentFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          filter_type: "non_existent_type",
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(nonExistentFilters);
  // Should return empty result
  TestValidator.equals(
    "non-existent filter type should return empty",
    nonExistentFilters.data.length,
    0,
  );
  // Test 9: Empty request (no filters) should return all filters
  const allFilters =
    await api.functional.multiUserTodo.member.filter_settings.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IMultiUserTodoTodoFilterSetting.IRequest,
      },
    );
  typia.assert(allFilters);
  // Should return all created filters (12 total)
  TestValidator.equals("all filters count", allFilters.data.length, 12);
}
