import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as superAdministrator using join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // Update super administrator connection with authorization token
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // Step 2: Since IRequest is empty, no pagination parameters (page, limit) can be passed;
  // so make a normal request to get system settings page
  const response =
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      authorizedConnection,
      {
        body: {} satisfies IDiscussionBoardSystemSetting.IRequest,
      },
    );
  typia.assert(response);
  // Step 3: Validate response pagination metadata
  const pagination = response.pagination;
  // Pagination metadata fields must be valid
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pagination.pages >= 0,
  );
  // If there are pages, current page should be within page count
  if (pagination.pages > 0) {
    TestValidator.predicate(
      "pagination current page is within total pages",
      pagination.current <= pagination.pages,
    );
  }
  // The data length must not exceed limit
  TestValidator.predicate(
    "data length not exceeding limit",
    response.data.length <= pagination.limit,
  );
  // Step 4: Test authorization enforcement by making request without auth header
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized without proper token", async () => {
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      noAuthConnection,
      {
        body: {},
      },
    );
  });
}
