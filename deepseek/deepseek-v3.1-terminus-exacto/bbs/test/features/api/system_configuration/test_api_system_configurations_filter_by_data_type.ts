import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
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
 * Test super administrator's ability to filter system configurations by data type.
 *
 * 1. Authenticate as super administrator
 * 2. Filter configurations by boolean data type
 * 3. Validate only boolean configurations are returned
 * 4. Test string data type filter
 * 5. Test integer data type filter
 * 6. Verify pagination works with filtered results
 * 7. Ensure data type integrity for all filtered configurations
 */
export async function test_api_system_configurations_filter_by_data_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test boolean data type filter
  const booleanResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "boolean" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(booleanResponse);
  // Validate all returned configurations are boolean type
  for (const config of booleanResponse.data) {
    TestValidator.equals(
      "config data_type should be boolean",
      config.data_type,
      "boolean",
    );
  }
  // 3. Test string data type filter
  const stringResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "string" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(stringResponse);
  for (const config of stringResponse.data) {
    TestValidator.equals(
      "config data_type should be string",
      config.data_type,
      "string",
    );
  }
  // 4. Test integer data type filter
  const integerResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "integer" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(integerResponse);
  for (const config of integerResponse.data) {
    TestValidator.equals(
      "config data_type should be integer",
      config.data_type,
      "integer",
    );
  }
  // 5. Test double data type filter
  const doubleResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "double" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(doubleResponse);
  for (const config of doubleResponse.data) {
    TestValidator.equals(
      "config data_type should be double",
      config.data_type,
      "double",
    );
  }
  // 6. Test json data type filter
  const jsonResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "json" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(jsonResponse);
  for (const config of jsonResponse.data) {
    TestValidator.equals(
      "config data_type should be json",
      config.data_type,
      "json",
    );
  }
  // 7. Test datetime data type filter
  const datetimeResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "datetime" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(datetimeResponse);
  for (const config of datetimeResponse.data) {
    TestValidator.equals(
      "config data_type should be datetime",
      config.data_type,
      "datetime",
    );
  }
  // 8. Test uri data type filter
  const uriResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "uri" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(uriResponse);
  for (const config of uriResponse.data) {
    TestValidator.equals(
      "config data_type should be uri",
      config.data_type,
      "uri",
    );
  }
  // 9. Test pagination with filtered results
  const paginatedResponse =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          data_type: "boolean" as const,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be >= 0",
    paginatedResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    paginatedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    paginatedResponse.pagination.pages >= 0,
  );
  // 10. Verify all configurations match their declared data type
  // Test value format consistency
  for (const config of booleanResponse.data) {
    if (config.value !== null) {
      TestValidator.predicate(
        "boolean config value should be 'true' or 'false'",
        config.value === "true" || config.value === "false",
      );
    }
  }
  for (const config of integerResponse.data) {
    if (config.value !== null) {
      TestValidator.predicate(
        "integer config value should be parseable as integer",
        Number.isInteger(Number(config.value)),
      );
    }
  }
}
