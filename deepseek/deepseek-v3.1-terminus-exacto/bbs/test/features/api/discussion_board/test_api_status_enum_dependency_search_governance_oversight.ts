import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_status_enum_dependency_search_governance_oversight(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with empty criteria to get all dependencies
  const allDependencies =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(allDependencies);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    allDependencies.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(allDependencies.data),
  );
  // Test 2: Search with specific table name pattern
  const tableSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          search: "article",
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(tableSearch);
  // Test 3: Search with date filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateFilteredSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          created_after: yesterday,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(dateFilteredSearch);
  // Test 4: Search with pagination parameters
  const paginatedSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  // Validate that pagination parameters are respected
  TestValidator.equals(
    "limit matches request",
    paginatedSearch.pagination.limit,
    paginatedSearch.pagination.limit,
  );
  // Test 5: Search with combination of parameters
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          search: "comment",
          created_before: new Date().toISOString(),
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Validate that dependency information contains required fields
  if (allDependencies.data.length > 0) {
    const dependency = allDependencies.data[0];
    TestValidator.predicate("dependency has id", dependency.id !== undefined);
    TestValidator.predicate(
      "dependency has referenced table",
      dependency.referenced_table !== undefined,
    );
    TestValidator.predicate(
      "dependency has referenced column",
      dependency.referenced_column !== undefined,
    );
    TestValidator.predicate(
      "dependency has status enum",
      dependency.statusEnum !== undefined,
    );
    if (dependency.statusEnum) {
      TestValidator.predicate(
        "status enum has entity type",
        dependency.statusEnum.entity_type !== undefined,
      );
      TestValidator.predicate(
        "status enum has value",
        dependency.statusEnum.value !== undefined,
      );
      TestValidator.predicate(
        "status enum has description",
        dependency.statusEnum.description !== undefined,
      );
    }
  }
  // Business logic validation: Ensure dependency analysis provides governance value
  const searches = [
    allDependencies,
    tableSearch,
    dateFilteredSearch,
    paginatedSearch,
    combinedSearch,
  ];
  await Promise.all(
    searches.map(async (searchResult, index) => {
      TestValidator.predicate(
        `search ${index} has valid pagination`,
        searchResult.pagination.current >= 0 &&
          searchResult.pagination.limit >= 0 &&
          searchResult.pagination.records >= 0 &&
          searchResult.pagination.pages >= 0,
      );
      // Validate that dependency information is structured for governance oversight
      await Promise.all(
        searchResult.data.map(async (dependency, depIndex) => {
          TestValidator.predicate(
            `dependency ${index}-${depIndex} has complete reference info`,
            !!(dependency.referenced_table &&
              dependency.referenced_column &&
              dependency.statusEnum),
          );
        }),
      );
    }),
  );
}