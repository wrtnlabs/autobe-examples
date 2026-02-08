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

export async function test_api_administrator_demote_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
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
  // Demote an existing administrator (simulate valid administratorId as random UUID since no creation API given)
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  const demotedAdministrator =
    await api.functional.discussionBoard.superAdministrator.administrators.demote(
      superAdminConnection,
      {
        administratorId: administratorId,
      },
    );
  typia.assert(demotedAdministrator);
  // Validate that returned administrator data contains expected properties
  // Since schema for IDiscussionBoardAdministrator is an empty object, just ensure it's an object
  TestValidator.predicate(
    "demoted administrator object check",
    typeof demotedAdministrator === "object" && demotedAdministrator !== null,
  );
}
