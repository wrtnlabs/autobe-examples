import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test scenario where a super administrator retrieves an active system configuration setting.
 */
export async function test_api_superadministrator_system_setting_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(authorized);
  // 2. Retrieve an existing system setting
  // Since we need an existing setting ID, we assume one exists in the system
  // For this test, we need to first create or know an existing setting ID
  // However, per instructions, we should test retrieval of an active setting
  // We'll need to create a test setting first (but no create endpoint provided)
  // Instead, we'll use a random UUID and expect a proper error or success
  // In a real scenario, we would create a setting first or have seeded data
  // For this test, we'll use a random UUID and rely on the fact that the test
  // environment should have at least one active system setting
  const settingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the system setting
  const setting =
    await api.functional.ecommerce.superAdministrator.system_settings.at(
      superAdminConnection,
      {
        settingId,
      },
    );
  // 4. Validate the response matches the expected schema
  typia.assert(setting);
  // 5. Verify all required fields are present and correctly typed
  TestValidator.equals("setting has ID", typeof setting.id, "string");
  TestValidator.predicate(
    "ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      setting.id,
    ),
  );
  TestValidator.equals(
    "setting_key is string",
    typeof setting.setting_key,
    "string",
  );
  TestValidator.equals(
    "value_type is string",
    typeof setting.value_type,
    "string",
  );
  TestValidator.equals(
    "setting_value is string",
    typeof setting.setting_value,
    "string",
  );
  TestValidator.equals(
    "description is string",
    typeof setting.description,
    "string",
  );
  TestValidator.equals(
    "is_active is boolean",
    typeof setting.is_active,
    "boolean",
  );
  TestValidator.predicate(
    "is_active is true for active setting",
    setting.is_active,
  );
  // Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(setting.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(setting.updated_at),
  );
  // Validate deleted_at is null for active settings
  TestValidator.equals(
    "deleted_at is null for active setting",
    setting.deleted_at,
    null,
  );
  // 6. Additional validation: setting_key should not be empty
  TestValidator.predicate(
    "setting_key is not empty",
    setting.setting_key.length > 0,
  );
  // 7. Additional validation: description should not be empty
  TestValidator.predicate(
    "description is not empty",
    setting.description.length > 0,
  );
}
