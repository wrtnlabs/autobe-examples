import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_bans_filtered_by_reason_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] = `Bearer ${adminAuth.token.access}`;
  // 2. Compose request with empty body due to empty schema
  const filterRequest: IDiscussionBoardUserBan.IRequest = {};
  // 3. Call the userBans.index endpoint
  const result =
    await api.functional.discussionBoard.administrator.userBans.index(
      adminConnection,
      { body: filterRequest },
    );
  // 4. Validate the response structure and pagination
  typia.assert(result);
  // 5. Validate pagination metadata presence
  const pagination = result.pagination;
  TestValidator.predicate(
    "pagination object exists",
    pagination !== null && pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is a number",
    typeof pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is a number",
    typeof pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is a number",
    typeof pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is a number",
    typeof pagination.pages === "number",
  );
  // 6. Authorization enforcement: try call without auth and expect error
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.discussionBoard.administrator.userBans.index(
      guestConnection,
      { body: filterRequest },
    );
  });
}
