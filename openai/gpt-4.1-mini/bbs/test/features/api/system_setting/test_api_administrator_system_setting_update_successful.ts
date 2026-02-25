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

export async function test_api_administrator_system_setting_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticated
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(administrator);
  // 2. Prepare an initial system setting to update
  // (We create one single system setting so we can update it)
  const initialBody = {
    key: "initial_setting_key",
    value: "initial_setting_value",
    description: "Initial setting description",
  } satisfies IDiscussionBoardSystemSetting.IUpdate;
  // 3. Create initial system setting by update call with random id
  // This is a workaround due to no creation API available
  const initialSetting =
    await api.functional.discussionBoard.administrator.systemSettings.update(
      adminConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: initialBody,
      },
    );
  typia.assert(initialSetting);
  // 4. Prepare update body with a new key, value, and description
  const updateBody = {
    key: "updated_setting_key",
    value: "updated_setting_value",
    description: "Updated setting description",
  } satisfies IDiscussionBoardSystemSetting.IUpdate;
  // 5. Update the existing system setting using the id from initialSetting
  const updatedSetting =
    await api.functional.discussionBoard.administrator.systemSettings.update(
      adminConnection,
      {
        id: initialSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSetting);
  // 6. Validate the updated fields are correct
  TestValidator.equals(
    "key should be updated",
    updatedSetting.key,
    updateBody.key,
  );
  TestValidator.equals(
    "value should be updated",
    updatedSetting.value,
    updateBody.value,
  );
  TestValidator.equals(
    "description should be updated",
    updatedSetting.description,
    updateBody.description,
  );
  // 7. Validate timestamps (must be strings, valid date-formats)
  TestValidator.predicate(
    "created_at should be a string",
    typeof updatedSetting.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at should be a string",
    typeof updatedSetting.updated_at === "string",
  );
  // 8. Validate that deleted_at is null after update
  TestValidator.equals(
    "deleted_at should be null",
    updatedSetting.deleted_at,
    null,
  );
}
