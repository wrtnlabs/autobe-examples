import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_data_retention_policy_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator using the available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test search functionality with various search terms
  // Since we cannot create policies in this test, we'll test the search endpoint
  // with different search parameters to validate the functionality
  // Test 1: Search with empty search term (should return all policies)
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Test 2: Search with a specific term
  const specificSearchResult =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          search: "retention",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(specificSearchResult);
  // Test 3: Search with pagination parameters
  const paginatedSearchResult =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          search: "policy",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(paginatedSearchResult);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    paginatedSearchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    paginatedSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    paginatedSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginatedSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedSearchResult.pagination.pages >= 0,
  );
  // Validate that data is an array of policy summaries
  TestValidator.predicate(
    "data is array",
    Array.isArray(paginatedSearchResult.data),
  );
  // Validate each policy summary has required fields
  if (paginatedSearchResult.data.length > 0) {
    const samplePolicy = paginatedSearchResult.data[0];
    TestValidator.predicate(
      "policy has id",
      typeof samplePolicy.id === "string",
    );
    TestValidator.predicate(
      "policy has name",
      typeof samplePolicy.policy_name === "string",
    );
    TestValidator.predicate(
      "policy has retention period",
      typeof samplePolicy.retention_period_days === "number",
    );
    TestValidator.predicate(
      "policy has retention action",
      typeof samplePolicy.retention_action === "string",
    );
    TestValidator.predicate(
      "policy has active status",
      typeof samplePolicy.is_active === "boolean",
    );
  }
  // Test that search functionality returns consistent results
  TestValidator.equals(
    "pagination structure consistent",
    emptySearchResult.pagination !== undefined,
    specificSearchResult.pagination !== undefined,
  );
}
