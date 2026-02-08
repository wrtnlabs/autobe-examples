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

export async function test_api_administrator_user_bans_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Use the updated adminConnection for authorization header
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Step 2: Retrieve the list of all banned users without filters
  const body: IDiscussionBoardUserBan.IRequest = {};
  const bannedUsersPage =
    await api.functional.discussionBoard.administrator.userBans.index(
      adminConnection,
      { body },
    );
  typia.assert(bannedUsersPage);
  // Step 3: Validate pagination information existence
  const pagination = bannedUsersPage.pagination;
  TestValidator.predicate(
    "pagination object exists",
    pagination !== undefined && pagination !== null,
  );
  TestValidator.predicate(
    "pagination.current is a number",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is a number",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is a number",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is a number",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // Step 4: Validate data array exists and each item is valid
  const bannedData = bannedUsersPage.data;
  TestValidator.predicate(
    "banned users data array exists",
    Array.isArray(bannedData),
  );
  for (const banSummary of bannedData) {
    typia.assert(banSummary);
  }
}
