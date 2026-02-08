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

export async function test_api_system_setting_at_retrieve_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Retrieve an existing system setting successfully
   * - Authenticate as an administrator via the join endpoint.
   * - Use a random UUID as system has no creation endpoint, test may be fragile.
   * - Retrieve system setting by ID.
   * - Validate full structure including id, key, value, description, created_at,
   *   updated_at, and deleted_at.
   * - Ensure typia.assert validates the entity.
   *
   * Scenario 2: Attempt to retrieve a non-existent system setting
   * - Authenticate as an administrator.
   * - Use a random UUID that does not exist.
   * - Expect 404 HTTP error with appropriate message.
   */
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Use a random UUID for retrieval testing - assumed existing
  const existingId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // Retrieve system setting
  const systemSetting =
    await api.functional.discussionBoard.administrator.systemSettings.at(
      adminConnection,
      { id: existingId },
    );
  typia.assert(systemSetting);

  // Attempt to retrieve non-existent system setting with random UUID
  const nonExistentId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "non-existent system setting should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.at(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
}
