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

export async function test_api_system_settings_filtered_search_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator join for authentication and token acquisition
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // headers updated internally during authorization
  // 2. Fetch system settings with empty filter (because IRequest is empty)
  const allResult =
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(allResult);
  // 3. Validate pagination metadata integrity
  const { pagination } = allResult;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records >= data length",
    pagination.records >= allResult.data.length,
  );
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  if (pagination.records > 0) {
    const expectedPages = Math.ceil(
      pagination.records / (pagination.limit || pagination.records),
    );
    TestValidator.equals(
      "pagination pages equals computed pages",
      pagination.pages,
      expectedPages,
    );
  }
  // 4. Authorization enforcement: attempt to call without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdministrator.systemSettings.index(
      unauthorizedConnection,
      {
        body: {},
      },
    );
  });
}
