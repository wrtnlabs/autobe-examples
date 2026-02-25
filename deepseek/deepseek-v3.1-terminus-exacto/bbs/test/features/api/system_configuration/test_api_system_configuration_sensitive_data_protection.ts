import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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
 * Test sensitive configuration data protection.
 *
 * This test verifies that sensitive system configuration values are appropriately
 * masked or omitted when retrieved by superAdmin users. The test covers:
 * - Filtering by is_sensitive=true to verify sensitive data protection
 * - Mixed sensitivity searches to ensure proper handling of both types
 * - Edge cases including null values and empty result sets
 * - Validation that metadata (config_key, category, etc.) remains visible
 */
export async function test_api_system_configuration_sensitive_data_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create the correct pagination structure based on the type definitions
  const pagination = {
    pagination: {
      pagination: {
        pagination: {
          current: 1,
          limit: 100,
          records: 0,
          pages: 0,
        },
        data: [],
      },
      data: [],
    },
    data: [],
  };
  // 2. Search for sensitive configurations only
  const sensitiveConfigs =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          is_sensitive: true,
          pagination: pagination,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(sensitiveConfigs);
  // 3. Search for non-sensitive configurations only
  const nonSensitiveConfigs =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          is_sensitive: false,
          pagination: pagination,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(nonSensitiveConfigs);
  // 4. Search without sensitivity filter (mixed results)
  const mixedConfigs =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          pagination: pagination,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(mixedConfigs);
  // 5. Validate response structure - all configurations should only expose metadata
  // The ISummary type confirms sensitive data protection by excluding config_value
  // Validate that sensitive configs response contains the expected properties
  TestValidator.predicate(
    "sensitive configs response has correct structure",
    () => {
      return sensitiveConfigs.data.every(
        (config) =>
          "config_key" in config &&
          "data_type" in config &&
          "category" in config &&
          "is_sensitive" in config &&
          !("config_value" in config),
      );
    },
  );
  // Validate that non-sensitive configs also follow the same protection pattern
  TestValidator.predicate(
    "non-sensitive configs response has correct structure",
    () => {
      return nonSensitiveConfigs.data.every(
        (config) =>
          "config_key" in config &&
          "data_type" in config &&
          "category" in config &&
          "is_sensitive" in config &&
          !("config_value" in config),
      );
    },
  );
  // Validate mixed configs follow the same pattern
  TestValidator.predicate(
    "mixed configs response has correct structure",
    () => {
      return mixedConfigs.data.every(
        (config) =>
          "config_key" in config &&
          "data_type" in config &&
          "category" in config &&
          "is_sensitive" in config &&
          !("config_value" in config),
      );
    },
  );
  // 6. Test edge case: search with null category
  const nullCategoryConfigs =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          category: null,
          pagination: pagination,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(nullCategoryConfigs);
  TestValidator.predicate(
    "null category search response has correct structure",
    () => {
      return nullCategoryConfigs.data.every(
        (config) =>
          "config_key" in config &&
          "data_type" in config &&
          "category" in config &&
          "is_sensitive" in config &&
          !("config_value" in config),
      );
    },
  );
}
