import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_demote_self_disallowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using join utility function with empty body
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // 2. Try to demote self using a randomly generated UUID (simulate self-admin ID)
  //    We test that this action is forbidden
  const selfAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "super administrator cannot demote themselves",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrators.demote(
        superAdminConnection,
        {
          administratorId: selfAdminId,
        },
      );
    },
  );
}
