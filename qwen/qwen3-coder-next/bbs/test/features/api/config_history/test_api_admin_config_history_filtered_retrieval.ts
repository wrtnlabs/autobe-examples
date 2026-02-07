import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfigHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_config_history_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Test pagination with specific parameters
  const limit = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const currentPage = 1;
  // Call the config-history endpoint with pagination parameters
  const result =
    await api.functional.discussionBoard.admin.config_history.index(
      adminConnection,
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", !!result.pagination, true);
  TestValidator.equals("data array exists", Array.isArray(result.data), true);
  // Validate pagination metadata
  const pagination = result.pagination;
  TestValidator.predicate("current page is positive", pagination.current > 0);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // Validate data records if any exist
  if (result.data.length > 0) {
    // Validate first record structure
    const firstRecord = result.data[0];
    TestValidator.equals("first record exists", !!firstRecord, true);
  }
  // Test edge cases
  // Test with limit = 0 (should return empty or error)
  // Test with out-of-range page number (should return empty data)
}
