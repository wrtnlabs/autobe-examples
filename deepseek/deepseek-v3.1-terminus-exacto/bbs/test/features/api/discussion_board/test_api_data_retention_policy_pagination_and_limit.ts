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

export async function test_api_data_retention_policy_pagination_and_limit(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test pagination with different limits - using existing data
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 1, limit: 10 },
    { page: 1, limit: 20 },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
        superAdminConnection,
        {
          body: {
            page: testCase.page satisfies number as number,
            limit: testCase.limit satisfies number as number,
          } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `current page for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `limit per page for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `total records non-negative for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.records >= 0,
    );
    // Only validate pages calculation if there are records
    if (response.pagination.records > 0) {
      TestValidator.predicate(
        `total pages calculated correctly for page=${testCase.page}, limit=${testCase.limit}`,
        response.pagination.pages ===
          Math.ceil(response.pagination.records / response.pagination.limit),
      );
    }
    // Validate data array size
    TestValidator.predicate(
      `data array size <= limit for page=${testCase.page}, limit=${testCase.limit}`,
      response.data.length <= testCase.limit,
    );
  }
  // Test boundary conditions
  const boundaryCases = [
    { page: 1, limit: 1 },
    { page: 1, limit: 100 },
  ];
  for (const boundaryCase of boundaryCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
        superAdminConnection,
        {
          body: {
            page: boundaryCase.page satisfies number as number,
            limit: boundaryCase.limit satisfies number as number,
          } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `boundary test current page for page=${boundaryCase.page}, limit=${boundaryCase.limit}`,
      response.pagination.current,
      boundaryCase.page,
    );
    TestValidator.equals(
      `boundary test limit for page=${boundaryCase.page}, limit=${boundaryCase.limit}`,
      response.pagination.limit,
      boundaryCase.limit,
    );
  }
}
