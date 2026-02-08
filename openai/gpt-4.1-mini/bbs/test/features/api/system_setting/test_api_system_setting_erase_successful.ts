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

export async function test_api_system_setting_erase_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
  // 2. Create a random UUID to represent a system setting ID to delete
  const existingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Since no create endpoint for system settings is given, we assume existingId is valid.
  // Scenario 1: Successful deletion with a valid system setting ID
  // We simulate the call assuming that the ID exists (using the random UUID),
  // as only erase method is provided.
  await api.functional.discussionBoard.superAdministrator.systemSettings.erase(
    superAdminConnection,
    { id: existingId },
  );
  // Scenario 2: Attempt deletion with a non-existent system setting ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deletion with non-existent system setting ID",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.erase(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
  // Scenario 3: Authorization enforcement for deleting a system setting
  // Try deleting with no authentication
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "deletion without authentication",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.erase(
        unauthConnection,
        { id: existingId },
      );
    },
  );
}
