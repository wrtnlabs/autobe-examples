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
import { generate_random_discussion_board_administrator_system_settings_create } from "../../../generate/generate_random_discussion_board_administrator_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_administrator_system_settings_create_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an administrator can create a new system-wide configuration setting successfully.
  // 1. Administrator sign up and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IDiscussionBoardAdministrator.IJoin has no properties, so pass empty object
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a unique key and value for the system setting
  const key = `setting_${RandomGenerator.alphabets(10)}`;
  const value = RandomGenerator.paragraph({ sentences: 1 });
  const description = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Create a new system setting
  const body: IDiscussionBoardSystemSetting.ICreate = {
    key,
    value,
    description,
  };
  const setting =
    await generate_random_discussion_board_administrator_system_settings_create(
      adminConnection,
      { body },
    );
  // Cast the setting to any to avoid TypeScript errors due to missing properties on IDiscussionBoardSystemSetting
  const response = setting as any;
  // 4. Validate the response
  typia.assert(response);
  // 5. Validate required fields
  TestValidator.predicate(
    "id is string",
    typeof response.id === "string" && response.id.length > 0,
  );
  TestValidator.equals("key matches", response.key, key);
  TestValidator.equals("value matches", response.value, value);
  TestValidator.equals(
    "description matches",
    response.description ?? null,
    description,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof response.created_at === "string" &&
      !isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof response.updated_at === "string" &&
      !isNaN(Date.parse(response.updated_at)),
  );
  // 6. Attempt to create a setting with duplicate key should throw error
  await TestValidator.error("duplicate key error", async () => {
    await generate_random_discussion_board_administrator_system_settings_create(
      adminConnection,
      {
        body: { key, value: value + "_new" },
      },
    );
  });
}
