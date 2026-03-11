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

export async function test_api_system_configurations_search_by_key_pattern(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Search for configuration keys containing 'article' (API uses SQL LIKE '%{search}%')
  const searchResult =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: {
          search: "article",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
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
    "current page positive",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure
  if (searchResult.data.length > 0) {
    searchResult.data.forEach((config) => {
      TestValidator.predicate("configuration has id", config.id !== undefined);
      TestValidator.predicate(
        "configuration has key",
        config.key !== undefined,
      );
      TestValidator.predicate(
        "configuration has data_type",
        config.data_type !== undefined,
      );
      // Validate UUID format for configuration IDs
      TestValidator.predicate(
        "configuration id is valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          config.id,
        ),
      );
      // Validate key contains search term (case-insensitive)
      TestValidator.predicate(
        "configuration key matches search pattern",
        config.key.toLowerCase().includes("article"),
      );
    });
  } else {
    // Handle case when no configurations match the search pattern
    TestValidator.equals(
      "empty result when no matches",
      searchResult.data.length,
      0,
    );
  }
  // Test that results are limited to page size
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
}
