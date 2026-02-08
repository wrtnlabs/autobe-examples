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
import { generate_random_discussion_board_super_administrator_system_settings_create } from "../../../generate/generate_random_discussion_board_super_administrator_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_system_setting_creation_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator and get a super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // Step 2: Attempt to create a system setting with super administrator (control) - should succeed
  const controlSystemSetting =
    await generate_random_discussion_board_super_administrator_system_settings_create(
      superAdminConnection,
      {},
    );
  typia.assert(controlSystemSetting);
  // Step 3: Prepare unauthorized actor connections:
  //    - regular admin (simulate by no token or improper token)
  //    - normal registered user (simulate no auth)
  //    - guest (no auth)
  // Since no utility function for other user roles or admin roles auth,
  // we simulate unauthorized attempt by using plain connection without auth header
  const unauthorizedConnections: {
    name: string;
    conn: api.IConnection;
  }[] = [
    { name: "regular admin", conn: { host: connection.host } },
    { name: "registered user", conn: { host: connection.host } },
    { name: "guest", conn: { host: connection.host } },
  ];
  // Request body for system setting to attempt
  const body = {};
  // Step 4: Expect error 403 forbidden for unauthorized attempts
  await Promise.all(
    unauthorizedConnections.map(async ({ name, conn }) => {
      await TestValidator.httpError(
        `unauthorized creation attempt by ${name}`,
        403,
        async () => {
          await api.functional.discussionBoard.superAdministrator.systemSettings.create(
            conn,
            {
              body,
            },
          );
        },
      );
    }),
  );
}
