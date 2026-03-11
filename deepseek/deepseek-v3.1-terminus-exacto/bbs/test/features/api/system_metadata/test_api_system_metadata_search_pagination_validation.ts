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

/**
 * Test pagination functionality and validation for the system metadata search operation.
 * Verify that pagination parameters are properly validated including page number bounds,
 * limit constraints, and handling of edge cases like requesting pages beyond the available data.
 * Test that the pagination metadata in the response accurately reflects the current page position,
 * total records, and page count calculations.
 */
export async function test_api_system_metadata_search_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "test-admin@example.com",
      password: "testpassword123",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic pagination with default parameters
  const response1 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    response1.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", response1.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    response1.pagination.pages >= 0,
  );
  // Test 2: Different page numbers
  const response2 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(response2);
  // Test 3: Maximum limit value
  const response3 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(response3);
  // Test 4: Minimum limit value
  const response4 =
    await api.functional.discussionBoard.superAdmin.system_metadata.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(response4);
  // Test 5: Pagination consistency across different pages
  if (response1.pagination.pages > 1) {
    const lastPageResponse =
      await api.functional.discussionBoard.superAdmin.system_metadata.index(
        superAdminConnection,
        {
          body: {
            page: response1.pagination.pages,
            limit: 10,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    // Validate that total records count remains consistent
    TestValidator.equals(
      "total records consistent across pages",
      response1.pagination.records,
      lastPageResponse.pagination.records,
    );
  }
  // Test 6: Pagination calculation validation
  const expectedPages = Math.ceil(
    response1.pagination.records / response1.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    response1.pagination.pages,
    expectedPages,
  );
  // Test 7: Data array length validation
  if (response1.pagination.current < response1.pagination.pages) {
    TestValidator.equals(
      "data array length matches limit on non-last page",
      response1.data.length,
      response1.pagination.limit,
    );
  }
}
