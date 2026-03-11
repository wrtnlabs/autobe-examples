import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configurations_empty_results_for_unmatched_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with random UUID that doesn't exist
  const randomSearchTerm = typia.random<string & tags.Format<"uuid">>();
  const searchResult1 =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: randomSearchTerm,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Filter by non-existent data type
  const searchResult2 =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          data_type: "datetime",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Combination of search term and data type that produces zero results
  const searchResult3 =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: "nonexistent_configuration_key_12345",
          data_type: "uri",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Search with random alphanumeric string
  const randomAlphanumeric = RandomGenerator.alphaNumeric(20);
  const searchResult4 =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          search: randomAlphanumeric,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(searchResult4);
}
