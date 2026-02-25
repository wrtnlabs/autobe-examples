import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
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

export async function test_api_discussion_board_super_administrator_health_check_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a superAdministrator specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use the authorize_super_administrator_join utility function to register and authenticate
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Update the superAdminConnection headers with the access token for authorization
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Generate a random UUID which does not exist in health checks
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the health check with the non-existent ID
  await TestValidator.httpError(
    "retrieving non-existent super administrator health check returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.healthChecks.at(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
}
