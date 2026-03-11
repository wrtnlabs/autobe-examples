import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_system_metadata_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Perform basic system metadata search without filters
  const searchResult =
    await api.functional.discussionBoard.admin.system_metadata.index(
      adminConnection,
      {
        body: {
          search: undefined,
          scope: undefined,
          data_type: undefined,
          status_type_id: undefined,
          page: undefined,
          limit: undefined,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  // Validate the response structure
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== undefined,
  );
  TestValidator.equals(
    "current page defaults to 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  // Validate each configuration summary contains required fields with proper formats
  for (const config of searchResult.data) {
    TestValidator.predicate(
      "configuration has uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
    TestValidator.predicate(
      "configuration has name",
      typeof config.name === "string" && config.name.length > 0,
    );
    TestValidator.predicate(
      "configuration has value",
      typeof config.value === "string",
    );
    TestValidator.predicate(
      "configuration has data_type",
      typeof config.data_type === "string" && config.data_type.length > 0,
    );
    TestValidator.predicate(
      "configuration has scope",
      typeof config.scope === "string" && config.scope.length > 0,
    );
    TestValidator.predicate(
      "configuration has uuid status_type_id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.status_type_id,
      ),
    );
  }
  // Validate that the search respects pagination limits
  TestValidator.predicate(
    "data length respects pagination limit",
    searchResult.data.length <= searchResult.pagination.limit,
  );
  // Validate pagination calculation
  TestValidator.equals(
    "pages calculation is correct",
    searchResult.pagination.pages,
    Math.ceil(searchResult.pagination.records / searchResult.pagination.limit),
  );
}
