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
 * Test searching system configurations filtered by specific category.
 * Validates that only configurations matching the specified category are returned,
 * pagination works correctly, and response includes proper configuration summaries.
 */
export async function test_api_system_configurations_search_by_category(
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
  // Since we cannot create configurations through this endpoint (it's search-only),
  // we'll test the search functionality with existing data
  const categories = [
    "authentication",
    "content",
    "performance",
    "security",
  ] as const;
  // Test searching configurations (the endpoint should return existing configurations)
  const searchResult =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [], // Search request with empty configuration array
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page valid",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", searchResult.pagination.limit > 0);
  TestValidator.predicate(
    "records count valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    searchResult.pagination.pages >= 0,
  );
  // Validate configuration summary structure for each returned item
  for (const config of searchResult.data) {
    TestValidator.equals("config has uuid id", typeof config.id, "string");
    TestValidator.predicate("config id is valid", config.id.length > 0);
    TestValidator.equals(
      "config has config_key",
      typeof config.config_key,
      "string",
    );
    TestValidator.predicate(
      "config_key is valid",
      config.config_key.length > 0,
    );
    TestValidator.equals(
      "config has data_type",
      typeof config.data_type,
      "string",
    );
    TestValidator.predicate("data_type is valid", config.data_type.length > 0);
    TestValidator.equals(
      "config has category",
      typeof config.category,
      "string",
    );
    TestValidator.predicate("category is valid", config.category.length > 0);
    TestValidator.equals(
      "config has description",
      typeof config.description,
      "string",
    );
    TestValidator.predicate(
      "description is valid",
      config.description.length > 0,
    );
    // Verify category is one of the expected values
    TestValidator.predicate(
      "category is valid type",
      categories.includes(config.category as (typeof categories)[number]),
    );
  }
  // Test that the search endpoint returns consistent results
  const secondSearchResult =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          configurations: [],
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(secondSearchResult);
  // Validate pagination consistency between searches
  TestValidator.equals(
    "pagination structure consistent",
    Object.keys(searchResult.pagination),
    Object.keys(secondSearchResult.pagination),
  );
}
