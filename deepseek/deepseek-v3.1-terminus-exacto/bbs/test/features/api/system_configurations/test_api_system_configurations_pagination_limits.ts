import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import type { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination behavior with different page sizes and limits for system configurations.
 * Validates that pagination metadata (current page, limit, total records, total pages)
 * is correctly calculated and supports proper navigation controls.
 */
export async function test_api_system_configurations_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test different pagination limits with actual search criteria
  const limits = [1, 5, 10, 20] as const;
  for (const limit of limits) {
    const response =
      await api.functional.discussionBoard.superAdmin.system_configurations.index(
        superAdminConnection,
        {
          body: {
            configurations: [
              {
                config_key: "test_key",
                data_type: "string",
                config_value: "test_value",
              } satisfies IDiscussionBoardSystemConfigurationValidationItem,
            ],
          } satisfies IDiscussionBoardSystemConfiguration.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} - current page`,
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} - page limit`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} - total records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `limit ${limit} - total pages non-negative`,
      response.pagination.pages >= 0,
    );
    // Validate pagination calculation
    const expectedPages =
      response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / response.pagination.limit);
    TestValidator.equals(
      `limit ${limit} - pages calculation`,
      response.pagination.pages,
      expectedPages,
    );
    // Validate data array size
    TestValidator.predicate(
      `limit ${limit} - data length <= limit`,
      response.data.length <= response.pagination.limit,
    );
  }
  // 3. Test empty result set with specific filter that returns no data
  const emptyResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "non_existent_key_12345",
              data_type: "string",
              config_value: "value",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate empty result set pagination
  TestValidator.equals(
    "empty result - current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result - total records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result - total pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result - data length",
    emptyResponse.data.length,
    0,
  );
}
