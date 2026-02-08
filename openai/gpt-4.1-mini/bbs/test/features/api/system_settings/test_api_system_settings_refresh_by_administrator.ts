import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_settings_refresh_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // Empty IJoin as per DTO
  });
  typia.assert(authorized);
  // Inject token into admin-specific connection headers
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Perform system settings refresh operation
  const refreshResponse =
    await api.functional.discussionBoard.system_settings.refresh.refreshSettings(
      adminConnection,
    );
  typia.assert(refreshResponse);
  // Since IRefreshResponse is an empty object, no further validation can be done
}
