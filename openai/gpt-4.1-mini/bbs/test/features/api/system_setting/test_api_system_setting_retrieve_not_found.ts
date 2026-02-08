import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_setting_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  superAdminConnection.headers = superAdminConnection.headers ?? {};
  superAdminConnection.headers.Authorization = joinOutput.token.access;
  // 2. Attempt to retrieve a system setting by a non-existent UUID
  await TestValidator.httpError("system setting not found", 404, async () => {
    await api.functional.discussionBoard.superAdministrator.systemSettings.at(
      superAdminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
