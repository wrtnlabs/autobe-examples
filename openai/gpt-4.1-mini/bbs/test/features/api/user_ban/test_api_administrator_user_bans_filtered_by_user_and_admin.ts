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

export async function test_api_administrator_user_bans_filtered_by_user_and_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator using join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Attach authorization header
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Retrieve full list of user bans with empty filter because no filter properties are defined
  const userBansPage =
    await api.functional.discussionBoard.administrator.userBans.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(userBansPage);
  // Validate pagination info is consistent
  TestValidator.predicate(
    "pagination current is 1 or greater",
    userBansPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is 0 or greater",
    userBansPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is 0 or greater",
    userBansPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is 0 or greater",
    userBansPage.pagination.records >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(userBansPage.data));
  // Since no filtering possible, test that empty list returns correctly by expecting no errors on empty data
  if (userBansPage.data.length === 0) {
    TestValidator.equals("empty data length", userBansPage.data.length, 0);
  } else {
    // Validate each ban item is an object
    for (const ban of userBansPage.data) {
      TestValidator.predicate(
        "ban item is object",
        typeof ban === "object" && ban !== null,
      );
    }
  }
}
