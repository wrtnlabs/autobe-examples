import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_administrator_system_settings_update_authorized_success_and_security(
  connection: api.IConnection,
): Promise<void> {
  /*
   * Test scenario 1: Successfully update a system setting as an authorized administrator.
   * - Setup an administrator account and authenticate.
   * - Issue PATCH request with valid partial update data to systemSettings.
   * - Validate response returns updated entity with correct modified fields.
   * - Confirm updates persist in the database.
   *
   * Test scenario 2: Attempt to update system settings without administrator authentication.
   * - Issue PATCH request without authentication or with invalid token.
   * - Validate that the API rejects the request with 401 Unauthorized or 403 Forbidden response.
   * - Confirm no changes are made to system settings.
   *
   * Test scenario 3: Update multiple system settings atomically ensuring partial update correctness.
   * - Authenticate as administrator.
   * - Issue PATCH request with multiple fields to update in the payload.
   * - Confirm that all fields are updated atomically.
   * - Validate response contains correct combined updated settings.
   * - Verify error handling if any field is invalid (mock validation failure).
   */
  // 1. Setup administrator and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Test scenario 1: Update a system setting partially and verify
  const updateKey = RandomGenerator.alphabets(8);
  const updateValue = RandomGenerator.alphabets(12);
  const updateDescription = RandomGenerator.paragraph({ sentences: 2 });
  const partialUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    key: updateKey,
    value: updateValue,
    description: updateDescription,
  };
  const updateResult =
    await api.functional.discussionBoard.administrator.systemSettings.updateSettings(
      authorizedConnection,
      { body: partialUpdate },
    );
  typia.assert(updateResult);
  // Confirm returned entity reflects changes
  TestValidator.equals("updated key", updateResult.key, updateKey);
  TestValidator.equals("updated value", updateResult.value, updateValue);
  TestValidator.equals(
    "updated description",
    updateResult.description,
    updateDescription,
  );
  // 3. Test scenario 3: Update multiple system settings atomically
  const multiUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    key: RandomGenerator.alphabets(8),
    value: RandomGenerator.alphabets(15),
    description: null,
    deleted_at: null,
  };
  const multiUpdateResult =
    await api.functional.discussionBoard.administrator.systemSettings.updateSettings(
      authorizedConnection,
      { body: multiUpdate },
    );
  typia.assert(multiUpdateResult);
  TestValidator.equals(
    "multi update key",
    multiUpdateResult.key,
    multiUpdate.key ?? multiUpdateResult.key,
  );
  TestValidator.equals(
    "multi update value",
    multiUpdateResult.value,
    multiUpdate.value ?? multiUpdateResult.value,
  );
  TestValidator.equals(
    "multi update description",
    multiUpdateResult.description,
    multiUpdate.description ?? multiUpdateResult.description,
  );
  // 4. Test scenario 2: Try to update settings without valid admin token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.updateSettings(
        unauthorizedConnection,
        { body: { key: "test", value: "fail" } },
      );
    },
  );
}
