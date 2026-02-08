import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFeatureFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_feature_flags_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare request body to filter with criteria that yield empty results
  // Since IDiscussionBoardFeatureFlag.IRequest has no properties, use empty body
  const requestBody: IDiscussionBoardFeatureFlag.IRequest = {};
  // Call the PATCH /discussionBoard/superAdministrator/featureFlags endpoint
  const result =
    await api.functional.discussionBoard.superAdministrator.featureFlags.index(
      superAdminConnection,
      { body: requestBody },
    );
  // Assert the response is well-formed and empty
  typia.assert(result);
  // Pagination check
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
  TestValidator.equals("limit per page", result.pagination.limit, 0);
  // Data array is empty
  TestValidator.equals("data length", result.data.length, 0);
}
