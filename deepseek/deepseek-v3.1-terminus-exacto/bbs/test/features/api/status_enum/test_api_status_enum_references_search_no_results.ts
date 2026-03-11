import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_enum_references_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Since we cannot create status enums through the API and don't have access to existing ones,
  // we need to use a realistic approach. The test should focus on validating the API behavior
  // when searching for references of a status enum that has none.
  // We'll use a valid UUID format but acknowledge that the actual existence depends on the test environment
  const statusEnumId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search with empty criteria and default pagination
  const emptySearchResponse =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId,
        body: {
          // Empty search criteria
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  // Validate empty result set structure
  TestValidator.equals("empty search data array", emptySearchResponse.data, []);
  TestValidator.predicate(
    "records should be non-negative",
    emptySearchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    emptySearchResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page should be positive",
    emptySearchResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    emptySearchResponse.pagination.limit > 0,
  );
  // Test 2: Search with specific pagination parameters
  const paginatedSearchResponse =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(paginatedSearchResponse);
  // Validate paginated empty result set
  TestValidator.equals(
    "paginated search data array",
    paginatedSearchResponse.data,
    [],
  );
  TestValidator.equals(
    "paginated search current page",
    paginatedSearchResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated search limit",
    paginatedSearchResponse.pagination.limit,
    5,
  );
  // Test 3: Search with filter criteria that won't match anything
  const filteredSearchResponse =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId,
        body: {
          search: "nonexistent_table_12345",
          created_after: new Date("2030-01-01T00:00:00Z").toISOString(),
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(filteredSearchResponse);
  // Validate filtered empty result set
  TestValidator.equals(
    "filtered search data array",
    filteredSearchResponse.data,
    [],
  );
  TestValidator.predicate(
    "filtered records should be non-negative",
    filteredSearchResponse.pagination.records >= 0,
  );
}
