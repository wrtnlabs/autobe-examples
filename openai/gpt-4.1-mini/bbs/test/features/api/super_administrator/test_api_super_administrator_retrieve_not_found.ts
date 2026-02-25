import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_administrator_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a super administrator user via join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // Use the authenticated super administrator connection
  superAdminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Generate a valid UUID that does not exist in DB
  const nonExistentSuperAdminId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Expect 404 Not Found when trying to retrieve non-existent super administrator
  await TestValidator.httpError(
    "retrieve non-existent super administrator should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrators.at(
        superAdminConnection,
        {
          superAdministratorId: nonExistentSuperAdminId,
        },
      );
    },
  );
}
