import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_unbans_no_records(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving user unban records when no records exist for given filters.
  // Validates the endpoint gracefully handles zero results without errors.
  // Authorization performed by administrator join dependency.
  // Authenticate as administrator to access protected endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Call userUnbans.index endpoint with empty filters (no records expected)
  const output =
    await api.functional.discussionBoard.administrator.userUnbans.index(
      adminConnection,
      { body: {} as IDiscussionBoardUserUnban.IRequest },
    );
  typia.assert(output);
  // Assert that pagination metadata is correct for zero results
  typia.assertGuard(output.pagination);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is non-negative",
    output.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination records count",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", output.pagination.pages, 0);
  // Assert that the data list is an array and empty
  typia.assertGuard(Array.isArray(output.data));
  TestValidator.equals("data list length", output.data.length, 0);
}
