import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test searching for inactive status enumeration values.
 * A super administrator specifically requests inactive status values to review
 * historical or deprecated status definitions. Validate that the response
 * includes only inactive values when explicitly requested, and verify that these
 * values are properly marked as inactive in the summary response.
 */
export async function test_api_status_enum_search_inactive_values(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search for inactive status values with explicit filter
  const searchRequest = {
    is_active: false,
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardStatusEnum.IRequest;
  const inactiveResults =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superConnection,
      { body: searchRequest },
    );
  typia.assert(inactiveResults);
  // Validate pagination structure
  typia.assert(inactiveResults.pagination);
  TestValidator.equals(
    "current page matches request",
    inactiveResults.pagination.current,
    searchRequest.page!,
  );
  TestValidator.equals(
    "limit matches request",
    inactiveResults.pagination.limit,
    searchRequest.limit!,
  );
  TestValidator.predicate(
    "records count is non-negative",
    inactiveResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    inactiveResults.pagination.pages >= 0,
  );
  // Validate all returned status values are inactive
  for (const status of inactiveResults.data) {
    typia.assert(status);
    TestValidator.equals("status is inactive", status.is_active, false);
  }
  // Test 2: Search for active status values to verify filtering works correctly
  const activeSearchRequest = {
    is_active: true,
    limit: searchRequest.limit,
    page: searchRequest.page,
  } satisfies IDiscussionBoardStatusEnum.IRequest;
  const activeResults =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superConnection,
      { body: activeSearchRequest },
    );
  typia.assert(activeResults);
  // Validate all returned status values are active
  for (const status of activeResults.data) {
    typia.assert(status);
    TestValidator.equals("status is active", status.is_active, true);
  }
  // Test 3: Search with no is_active filter (should return both active and inactive)
  const mixedSearchRequest = {
    limit: searchRequest.limit,
    page: searchRequest.page,
  } satisfies IDiscussionBoardStatusEnum.IRequest;
  const mixedResults =
    await api.functional.discussionBoard.superAdmin.status_enums.index(
      superConnection,
      { body: mixedSearchRequest },
    );
  typia.assert(mixedResults);
  // Test 4: Verify response structure and types for all results
  TestValidator.equals(
    "pagination structure consistent",
    typeof mixedResults.pagination,
    "object",
  );
  TestValidator.predicate("data is array", Array.isArray(mixedResults.data));
  // Additional business logic validation
  if (inactiveResults.data.length > 0) {
    // If we found inactive statuses, verify they have proper structure
    const sampleInactive = inactiveResults.data[0];
    TestValidator.predicate(
      "inactive status has entity_type",
      typeof sampleInactive.entity_type === "string",
    );
    TestValidator.predicate(
      "inactive status has value",
      typeof sampleInactive.value === "string",
    );
    TestValidator.predicate(
      "inactive status has description",
      typeof sampleInactive.description === "string",
    );
    TestValidator.predicate(
      "inactive status has sort_order",
      typeof sampleInactive.sort_order === "number",
    );
  }
}
