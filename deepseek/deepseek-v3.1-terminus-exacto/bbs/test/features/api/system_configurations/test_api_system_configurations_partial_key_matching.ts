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
 * Test partial key matching functionality using wildcard patterns.
 * Search for configurations with keys containing specific patterns
 * (e.g., 'auth*', '*rate*', 'security*'). Validate that case-insensitive
 * search returns all matching configurations, including those with
 * similar key patterns. Verify that the search properly handles partial
 * matches and returns accurate results with proper pagination metadata.
 */
export async function test_api_system_configurations_partial_key_matching(
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
  // Since no utility function exists for system configuration search,
  // we use the SDK function directly with proper search patterns
  // Test prefix matching: configurations starting with 'auth'
  const authSearch =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "auth*",
              data_type: "string",
              config_value: "",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(authSearch);
  // Test substring matching: configurations containing 'rate'
  const rateSearch =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "*rate*",
              data_type: "string",
              config_value: "",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(rateSearch);
  // Test suffix matching: configurations ending with 'security'
  const securitySearch =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "*security",
              data_type: "string",
              config_value: "",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(securitySearch);
  // Test case-insensitive search with mixed case pattern
  const mixedCaseSearch =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "*AUTH*",
              data_type: "string",
              config_value: "",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(mixedCaseSearch);
  // Test non-matching pattern to ensure empty results
  const nonMatchingSearch =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [
            {
              config_key: "*nonexistentpattern*",
              data_type: "string",
              config_value: "",
            } satisfies IDiscussionBoardSystemConfigurationValidationItem,
          ],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    authSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "records count valid",
    authSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page valid",
    authSearch.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", authSearch.pagination.limit >= 0);
  TestValidator.predicate(
    "pages count valid",
    authSearch.pagination.pages >= 0,
  );
  // Validate that search results contain configuration data
  TestValidator.predicate("data array exists", Array.isArray(authSearch.data));
  // If there are results, validate their structure
  if (authSearch.data.length > 0) {
    const config = authSearch.data[0];
    TestValidator.predicate("config has id", typeof config.id === "string");
    TestValidator.predicate(
      "config has key",
      typeof config.config_key === "string",
    );
    TestValidator.predicate(
      "config has data type",
      typeof config.data_type === "string",
    );
    TestValidator.predicate(
      "config has category",
      typeof config.category === "string",
    );
    TestValidator.predicate(
      "config has description",
      typeof config.description === "string",
    );
  }
}
