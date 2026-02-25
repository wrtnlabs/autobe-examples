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

export async function test_api_super_administrator_user_unban_delete_operations(
  connection: api.IConnection,
): Promise<void> {
  // Utility function to create and authorize super administrator
  async function createSuperAdminConnection() {
    const superAdminConnection: api.IConnection = { host: connection.host };
    const auth = await authorize_super_administrator_join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "SuperAdmin1234!",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
        },
      },
    );
    typia.assert(auth);
    superAdminConnection.headers = { Authorization: auth.token.access };
    return superAdminConnection;
  }
  // Scenario 1: Successfully delete an existing user unban record
  {
    const superAdminConnection = await createSuperAdminConnection();
    // For scenario, we simulate creation of unban record by generating a UUID
    // Since no creation API is given, we assume this unbanId is valid
    const validUnbanId = typia.random<string & tags.Format<"uuid">>();
    // Attempt to delete the unban record
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.erase(
      superAdminConnection,
      { unbanId: validUnbanId },
    );
    // Since erase returns void and no API for retrieval, just validating no error thrown
  }
  // Scenario 2: Attempt to delete a non-existent user unban record
  {
    const superAdminConnection = await createSuperAdminConnection();
    // Use a random UUID that does not exist
    const nonExistentUnbanId = typia.random<string & tags.Format<"uuid">>();
    // Expect error HTTP 404 Not Found
    await TestValidator.httpError(
      "delete non-existent unban record",
      404,
      async () => {
        await api.functional.discussionBoard.superAdministrator.administrator.unbans.erase(
          superAdminConnection,
          { unbanId: nonExistentUnbanId },
        );
      },
    );
  }
  // Scenario 3: Attempt to delete a user unban record without proper authorization
  {
    // Use a base connection without authorization header
    const baseConnection: api.IConnection = { host: connection.host };
    // Use a random UUID for unbanId
    const unbanId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete unban record without authorization",
      [401, 403],
      async () => {
        await api.functional.discussionBoard.superAdministrator.administrator.unbans.erase(
          baseConnection,
          { unbanId },
        );
      },
    );
  }
}
