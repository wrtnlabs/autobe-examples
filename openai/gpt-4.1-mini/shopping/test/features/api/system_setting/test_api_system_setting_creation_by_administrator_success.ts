import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_system_settings_create_system_setting } from "../../../generate/generate_random_shopping_mall_administrator_system_settings_create_system_setting";
import { prepare_random_shopping_mall_system_setting } from "../../../prepare/prepare_random_shopping_mall_system_setting";

export async function test_api_system_setting_creation_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and join (authenticate)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "StrongP@ssw0rd",
    },
  });
  typia.assert(adminAuthorized);
  // Update adminConnection headers with Authorization token
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] =
    `Bearer ${adminAuthorized.token.access}`;
  // 2. Create system setting with optional description
  const createBodyWithDescription: IShoppingMallSystemSetting.ICreate = {
    key: `setting_${RandomGenerator.alphabets(5)}`,
    value: `value_${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    data_type: "string",
  };
  const createdSettingWithDesc: IShoppingMallSystemSetting =
    await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
      adminConnection,
      {
        body: createBodyWithDescription,
      },
    );
  typia.assert(createdSettingWithDesc);
  // 3. Validate fields for created system setting with description
  TestValidator.predicate(
    "created setting id is UUID format",
    /[0-9a-fA-F-]{36}/.test(createdSettingWithDesc.id),
  );
  TestValidator.equals(
    "created setting key",
    createdSettingWithDesc.key,
    createBodyWithDescription.key,
  );
  TestValidator.equals(
    "created setting value",
    createdSettingWithDesc.value,
    createBodyWithDescription.value,
  );
  TestValidator.equals(
    "created setting description",
    createdSettingWithDesc.description,
    createBodyWithDescription.description,
  );
  TestValidator.equals(
    "created setting data_type",
    createdSettingWithDesc.data_type,
    createBodyWithDescription.data_type,
  );
  TestValidator.predicate(
    "created setting created_at is ISO string",
    typeof createdSettingWithDesc.created_at === "string",
  );
  TestValidator.predicate(
    "created setting updated_at is ISO string",
    typeof createdSettingWithDesc.updated_at === "string",
  );
  TestValidator.predicate(
    "created setting deleted_at is null or undefined",
    createdSettingWithDesc.deleted_at === null ||
      createdSettingWithDesc.deleted_at === undefined,
  );
  // 4. Create system setting without description (optional field omitted)
  const createBodyNoDescription: IShoppingMallSystemSetting.ICreate = {
    key: `setting_${RandomGenerator.alphabets(5)}`,
    value: `value_${RandomGenerator.alphabets(5)}`,
    data_type: "string",
  };
  const createdSettingNoDesc: IShoppingMallSystemSetting =
    await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
      adminConnection,
      {
        body: createBodyNoDescription,
      },
    );
  typia.assert(createdSettingNoDesc);
  // 5. Validate fields for created system setting without description
  TestValidator.predicate(
    "created setting without description id is UUID format",
    /[0-9a-fA-F-]{36}/.test(createdSettingNoDesc.id),
  );
  TestValidator.equals(
    "created setting without description key",
    createdSettingNoDesc.key,
    createBodyNoDescription.key,
  );
  TestValidator.equals(
    "created setting without description value",
    createdSettingNoDesc.value,
    createBodyNoDescription.value,
  );
  TestValidator.equals(
    "created setting without description description",
    createdSettingNoDesc.description ?? null,
    null,
  );
  TestValidator.equals(
    "created setting without description data_type",
    createdSettingNoDesc.data_type,
    createBodyNoDescription.data_type,
  );
  TestValidator.predicate(
    "created setting without description created_at is ISO string",
    typeof createdSettingNoDesc.created_at === "string",
  );
  TestValidator.predicate(
    "created setting without description updated_at is ISO string",
    typeof createdSettingNoDesc.updated_at === "string",
  );
  TestValidator.predicate(
    "created setting without description deleted_at is null or undefined",
    createdSettingNoDesc.deleted_at === null ||
      createdSettingNoDesc.deleted_at === undefined,
  );
}
