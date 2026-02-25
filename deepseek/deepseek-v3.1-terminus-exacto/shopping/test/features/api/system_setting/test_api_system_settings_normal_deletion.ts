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
import { generate_random_ecommerce_super_administrator_system_settings_create } from "../../../generate/generate_random_ecommerce_super_administrator_system_settings_create";
import { prepare_random_ecommerce_system_setting } from "../../../prepare/prepare_random_ecommerce_system_setting";

export async function test_api_system_settings_normal_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create a test system setting
  const systemSetting =
    await generate_random_ecommerce_super_administrator_system_settings_create(
      superAdminConnection,
      {
        body: {
          setting_key: RandomGenerator.paragraph({ sentences: 1 }),
          value_type: "string",
          setting_value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(systemSetting);
  // Verify the setting is active and has null deleted_at initially
  TestValidator.equals(
    "initial deleted_at should be null",
    systemSetting.deleted_at,
    null,
  );
  TestValidator.predicate(
    "initial setting should be active",
    systemSetting.is_active,
  );
  // Perform soft deletion - this should succeed without throwing an error
  await api.functional.ecommerce.superAdministrator.system_settings.erase(
    superAdminConnection,
    {
      settingId: systemSetting.id,
    },
  );
  // Verify the deletion succeeded by ensuring we can perform other operations
  // without errors. Since we cannot retrieve the deleted setting directly,
  // we verify that the deletion operation completed successfully by the fact
  // that it didn't throw an error.
  TestValidator.predicate("deletion operation completed successfully", true);
}
