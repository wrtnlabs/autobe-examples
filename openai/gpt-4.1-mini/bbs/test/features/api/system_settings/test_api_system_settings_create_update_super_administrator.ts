import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_system_settings_create_system_settings } from "../../../generate/generate_random_discussion_board_super_administrator_system_settings_create_system_settings";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_system_settings_create_update_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Try to create/update system setting without login - expect failure
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.createSystemSettings(
        { host: connection.host },
        {
          body: {
            key: "testSetting",
            value: "testValue",
            description: "Should fail due to missing auth",
          },
        },
      );
    },
  );
  // 3. Create a new system setting with valid data
  const settingKey = `setting_${RandomGenerator.alphabets(6)}`;
  const settingValue = `value_${RandomGenerator.alphabets(8)}`;
  const settingDescription = RandomGenerator.paragraph({ sentences: 2 });
  const createdSetting =
    await generate_random_discussion_board_super_administrator_system_settings_create_system_settings(
      superAdminConnection,
      {
        body: {
          key: settingKey,
          value: settingValue,
          description: settingDescription,
        },
      },
    );
  typia.assert(createdSetting);
  // 4. Validate returned system setting properties
  TestValidator.equals("created key", createdSetting.key, settingKey);
  TestValidator.equals("created value", createdSetting.value, settingValue);
  TestValidator.equals(
    "created description",
    createdSetting.description,
    settingDescription,
  );
  TestValidator.predicate(
    "created id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdSetting.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    Boolean(
      createdSetting.created_at &&
      !Number.isNaN(Date.parse(createdSetting.created_at)),
    ),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    Boolean(
      createdSetting.updated_at &&
      !Number.isNaN(Date.parse(createdSetting.updated_at)),
    ),
  );
  TestValidator.equals("deletedAt is null", createdSetting.deleted_at, null);
  // 5. Attempt create system setting with missing key - expect failure
  await TestValidator.httpError("missing key field", 400, async () => {
    await generate_random_discussion_board_super_administrator_system_settings_create_system_settings(
      superAdminConnection,
      {
        body: {
          value: "someValue",
          description: "Missing key should cause validation error",
        },
      },
    );
  });
  // 6. Attempt create system setting with missing value - expect failure
  await TestValidator.httpError("missing value field", 400, async () => {
    await generate_random_discussion_board_super_administrator_system_settings_create_system_settings(
      superAdminConnection,
      {
        body: {
          key: "someKey",
          description: "Missing value should cause validation error",
        },
      },
    );
  });
  // 7. Update the existing system setting with new value and no description
  const updatedValue = `updated_${RandomGenerator.alphabets(7)}`;
  const updatedSetting =
    await generate_random_discussion_board_super_administrator_system_settings_create_system_settings(
      superAdminConnection,
      {
        body: {
          key: settingKey,
          value: updatedValue,
          description: null,
        },
      },
    );
  typia.assert(updatedSetting);
  TestValidator.equals("updated key", updatedSetting.key, settingKey);
  TestValidator.equals("updated value", updatedSetting.value, updatedValue);
  TestValidator.equals("updated description", updatedSetting.description, null);
  // 8. Attempt access with non-super administrator connection (simulate by no token) - expect failure
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "guest cannot create system setting",
    401,
    async () => {
      await generate_random_discussion_board_super_administrator_system_settings_create_system_settings(
        guestConnection,
        {
          body: {
            key: `guest_key_${RandomGenerator.alphabets(5)}`,
            value: `guest_value_${RandomGenerator.alphabets(5)}`,
            description: "Guest access is not allowed",
          },
        },
      );
    },
  );
}
