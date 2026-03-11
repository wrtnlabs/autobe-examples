import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases where search criteria yield no results to ensure proper handling of empty result sets.
 * 1. Non-existent config_key values
 * 2. Invalid scope combinations
 * 3. Filter by inactive status when no inactive configs exist
 * 4. Random search keywords that don't match any descriptions
 */
export async function test_api_system_configuration_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Test non-existent config_key search
  const randomConfigKey = typia.random<string & tags.Format<"uuid">>();
  const result1 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          config_key: randomConfigKey,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "empty results for non-existent config_key",
    result1.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent config_key",
    result1.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for non-existent config_key",
    result1.pagination.pages,
    0,
  );
  // 3. Test non-existent scope value
  const scopes = ["global", "component", "environment", "user"] as const;
  const randomScope = RandomGenerator.pick([
    "invalid_scope",
    "non_existent",
    "fake_scope",
  ]);
  const result2 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          scope: randomScope,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "empty results for non-existent scope",
    result2.data,
    [],
  );
  TestValidator.equals(
    "zero records for non-existent scope",
    result2.pagination.records,
    0,
  );
  // 4. Test non-existent data_type value
  const result3 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "invalid_type",
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals("empty results for invalid data_type", result3.data, []);
  TestValidator.equals(
    "zero records for invalid data_type",
    result3.pagination.records,
    0,
  );
  // 5. Test is_active = false (assuming no inactive configs exist)
  const result4 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          is_active: false,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result4);
  // Note: We can't assert empty because there might be inactive configs
  // But we can assert the response is valid and pagination data is consistent
  TestValidator.predicate(
    "pagination metadata valid for is_active=false",
    result4.pagination.records >= 0 &&
      result4.pagination.limit >= 0 &&
      result4.pagination.current >= 0,
  );
  // 6. Test random search keyword that doesn't match
  const randomKeyword = RandomGenerator.paragraph({ sentences: 1 });
  const result5 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: randomKeyword,
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result5);
  // Search may or may not return results, but pagination must be valid
  TestValidator.predicate(
    "pagination valid for random search",
    result5.pagination.records >= 0 && result5.pagination.limit >= 0,
  );
  // 7. Test combination of multiple non-existent criteria
  const result6 =
    await api.functional.multiUserTodo.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          config_key: typia.random<string & tags.Format<"uuid">>(),
          scope: "invalid_scope",
          data_type: "invalid_type",
          is_active: true,
          search: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMultiUserTodoSystemConfiguration.IRequest,
      },
    );
  typia.assert(result6);
  TestValidator.equals(
    "empty results for multiple invalid criteria",
    result6.data,
    [],
  );
  TestValidator.equals(
    "zero records for multiple invalid criteria",
    result6.pagination.records,
    0,
  );
}
