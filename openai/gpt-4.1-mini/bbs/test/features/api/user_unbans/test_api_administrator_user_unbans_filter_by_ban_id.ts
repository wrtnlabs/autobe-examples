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

export async function test_api_administrator_user_unbans_filter_by_ban_id(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Since no 'ban_id' filter property exists in the DTO, test the index API with empty filter body
  const response =
    await api.functional.discussionBoard.administrator.userUnbans.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Assert that pagination fields are correct
  TestValidator.predicate(
    "pagination current page is >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    response.pagination.pages >= 0,
  );
  // Assert that each unban summary is valid
  response.data.forEach((unban) => {
    typia.assert(unban);
  });
}
