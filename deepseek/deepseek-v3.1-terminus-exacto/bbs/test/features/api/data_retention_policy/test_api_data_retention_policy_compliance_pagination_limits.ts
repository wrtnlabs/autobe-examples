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

export async function test_api_data_retention_policy_compliance_pagination_limits(
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
  // Test different page sizes
  const pageSizes = [1, 5, 10, 20, 50, 100] as const;
  for (const pageSize of pageSizes) {
    const response =
      await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
        superAdminConnection,
        {
          body: {
            limit: pageSize satisfies number as number,
            page: 1 satisfies number as number,
          } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `page size ${pageSize} limit matches requested`,
      response.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page size ${pageSize} current page is 1`,
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      `page size ${pageSize} records count is valid`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page size ${pageSize} pages count is valid`,
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `page size ${pageSize} data length matches limit`,
      response.data.length <= pageSize,
    );
  }
  // Test page navigation
  const firstPageResponse =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  const secondPageResponse =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 2 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Validate pagination consistency
  TestValidator.equals(
    "total records count consistent across pages",
    firstPageResponse.pagination.records,
    secondPageResponse.pagination.records,
  );
  // Test edge case: page beyond available range
  const highPageResponse =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          limit: 10 satisfies number as number,
          page: 9999 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.predicate(
    "high page number returns empty data array",
    highPageResponse.data.length === 0,
  );
  // Test minimum limit
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          limit: 1 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit of 1 works correctly",
    minLimitResponse.pagination.limit,
    1,
  );
  // Test maximum limit
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number as number,
          page: 1 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit of 100 works correctly",
    maxLimitResponse.pagination.limit,
    100,
  );
}
