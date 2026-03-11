import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configurations_filter_by_data_type_and_value(
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
  // Test 1: Filter by specific data types - string
  const stringConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "string",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(stringConfigs);
  // Test 2: Filter by boolean data type
  const booleanConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "boolean",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(booleanConfigs);
  // Test 3: Combined search with data type filter
  const searchTerm = "user";
  const searchedConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: searchTerm,
          data_type: "string",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchedConfigs);
  // Test 4: Pagination validation
  const paginatedConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
          sort: "key",
          sort_direction: "asc",
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(paginatedConfigs);
  TestValidator.predicate(
    "page should have correct limit",
    paginatedConfigs.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedConfigs.pagination.limit === 3 &&
      paginatedConfigs.pagination.current === 1,
  );
  // Test 5: Search functionality with different data types
  const jsonConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "json",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(jsonConfigs);
  // Test 6: Different sorting options
  const sortedByCreatedAt =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          sort_direction: "desc",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // Test 7: Integer data type filtering
  const integerConfigs =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "integer",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(integerConfigs);
}
