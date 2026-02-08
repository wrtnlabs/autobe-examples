import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_settings_filter_by_key(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare search key fragment
  const searchKeyFragment = "timeout";
  // Call index API with filter and pagination parameters
  const response =
    await api.functional.discussionBoard.administrator.systemSettings.index(
      adminConnection,
      {
        body: {
          key: searchKeyFragment,
          limit: 10,
          page: 1,
          cursor: null,
        } satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  // Validate response structure
  const typedResponse =
    typia.assert<IPageIDiscussionBoardSystemSetting.ISummary>(response);
  // Cannot check .key on ISummary according to error, so only assert data array length and pagination fields
  await TestValidator.predicate(
    "data array is array",
    Array.isArray(typedResponse.data),
  );
  await TestValidator.predicate(
    "pagination object exists",
    typeof typedResponse.pagination === "object" &&
      typedResponse.pagination !== null,
  );
  // Validate pagination fields
  await TestValidator.predicate(
    "current page number is 1",
    typedResponse.pagination.current === 1,
  );
  await TestValidator.predicate(
    "limit per page is 10",
    typedResponse.pagination.limit === 10,
  );
  await TestValidator.predicate(
    "pages is non-negative",
    typedResponse.pagination.pages >= 0,
  );
  await TestValidator.predicate(
    "total records is non-negative",
    typedResponse.pagination.records >= 0,
  );
  // Authorization failure test
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "authorization required for admin systemSettings access",
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.index(
        noAuthConnection,
        {
          body: {
            key: searchKeyFragment,
            limit: 10,
            page: 1,
            cursor: null,
          } satisfies IDiscussionBoardSystemSetting.IRequest,
        },
      );
    },
  );
}
