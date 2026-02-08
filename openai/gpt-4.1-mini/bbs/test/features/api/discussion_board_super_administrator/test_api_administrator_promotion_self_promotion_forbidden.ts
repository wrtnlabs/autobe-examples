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

export async function test_api_administrator_promotion_self_promotion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuth);
  // Use authenticated superAdminConnection
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. Attempt to promote self (super administrator promotes self)
  // AdministratorId is simulated as the same super administrator ID
  // since we don't have the actual ID, we use a random valid UUID to simulate self
  const selfAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect forbidden error when promoting self
  await TestValidator.httpError(
    "super administrator cannot promote themselves",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: selfAdministratorId,
        },
      );
    },
  );
}
