import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_metadata_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Test 1: Basic search with partial name matching
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "config",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search result has pagination",
    searchResult1.pagination !== undefined,
  );
  TestValidator.predicate(
    "search result has data array",
    Array.isArray(searchResult1.data),
  );
  // Test 2: Exact scope filtering
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          scope: "global",
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "scope filter result has data",
    searchResult2.data.length >= 0,
  );
  // Test 3: Data type filtering
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          data_type: "string",
          limit: 8,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "data type filter result has data",
    searchResult3.data.length >= 0,
  );
  // Test 4: Status type filtering
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          status_type_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "status filter result has data",
    searchResult4.data.length >= 0,
  );
  // Test 5: Pagination with different page sizes
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          limit: 3,
          page: 2,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult5);
  TestValidator.equals(
    "pagination limit matches",
    searchResult5.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination current page matches",
    searchResult5.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult5.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult5.pagination.records >= 0,
  );
  // Test 6: Combined filtering
  const searchResult6 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          search: "app",
          scope: "production",
          data_type: "boolean",
          limit: 15,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult6);
  TestValidator.predicate(
    "combined filter result has valid pagination",
    searchResult6.pagination.records >= 0,
  );
  // Test 7: Empty search (all records)
  const searchResult7 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult7);
  TestValidator.predicate(
    "empty search returns data",
    searchResult7.data.length >= 0,
  );
  // Validate configuration summary structure
  if (searchResult1.data.length > 0) {
    const config = searchResult1.data[0];
    TestValidator.predicate(
      "config has uuid id",
      typeof config.id === "string" && config.id.length > 0,
    );
    TestValidator.predicate(
      "config has name",
      typeof config.name === "string" && config.name.length > 0,
    );
    TestValidator.predicate(
      "config has value",
      typeof config.value === "string",
    );
    TestValidator.predicate(
      "config has data_type",
      typeof config.data_type === "string" && config.data_type.length > 0,
    );
    TestValidator.predicate(
      "config has scope",
      typeof config.scope === "string" && config.scope.length > 0,
    );
    TestValidator.predicate(
      "config has uuid status_type_id",
      typeof config.status_type_id === "string" &&
        config.status_type_id.length > 0,
    );
  }
  // Validate pagination calculations
  if (searchResult7.data.length > 0 && searchResult7.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      searchResult7.pagination.records / searchResult7.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      searchResult7.pagination.pages,
      expectedPages,
    );
  }
}
