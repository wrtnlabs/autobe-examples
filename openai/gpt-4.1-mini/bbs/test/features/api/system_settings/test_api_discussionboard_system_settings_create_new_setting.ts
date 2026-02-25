import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_discussion_board_administrator_system_settings_create_system_settings } from "../../../generate/generate_random_discussion_board_administrator_system_settings_create_system_settings";

export async function test_api_discussionboard_system_settings_create_new_setting(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, { body: {} });

  const body: IDiscussionBoardSystemSetting.ICreate = {
    key: `testKey_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
    value: typia.random<string>(),
    description: typia.random<string>(),
  };
  const output = await generate_random_discussion_board_administrator_system_settings_create_system_settings(adminConnection, { body });
  typia.assert(output);
  TestValidator.predicate(
    "has assigned UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(output.id),
  );
  TestValidator.equals("key matches", output.key, body.key);
  TestValidator.equals("value matches", output.value, body.value);
  if (body.description !== null && body.description !== undefined)
    TestValidator.equals("description matches", output.description, body.description);
  else TestValidator.predicate("description is null", output.description === null);
  TestValidator.predicate(
    "createdAt ISO format",
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d+Z$/.test(output.created_at),
  );
  TestValidator.predicate(
    "updatedAt ISO format",
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d+Z$/.test(output.updated_at),
  );
  TestValidator.predicate("deletedAt is null", output.deleted_at === null);
}
