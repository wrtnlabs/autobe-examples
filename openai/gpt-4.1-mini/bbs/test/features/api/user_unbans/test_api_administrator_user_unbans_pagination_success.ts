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

export async function test_api_administrator_user_unbans_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator to access protected endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Prepare request body with default filters (empty request)
  const body: IDiscussionBoardUserUnban.IRequest = {};
  // Call the user unbans pagination API
  const output: IPageIDiscussionBoardUserUnban.ISummary =
    await api.functional.discussionBoard.administrator.userUnbans.index(
      adminConnection,
      { body },
    );
  // Validate the response structure and content
  typia.assert(output);
  // Check that pagination metadata is valid
  const pagination = output.pagination;
  TestValidator.predicate(
    "current page is number",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof pagination.pages === "number",
  );
  // Validate each unban record
  for (const unban of output.data) {
    typia.assert(unban);
    // Unban record fields like reason, related ban record info, admin info, timestamps are validated implicitly by typia.assert
  }
}
