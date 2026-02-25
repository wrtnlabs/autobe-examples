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

/**
 * Test successful creation of a string-type system configuration setting by a super administrator.
 */
export async function test_api_system_setting_string_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const auth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // Create system setting with string type
  const systemSetting =
    await api.functional.ecommerce.superAdministrator.system_settings.create(
      adminConnection,
      {
        body: {
          setting_key: "payment.gateway.timeout",
          value_type: "string",
          setting_value: "30s",
          description: "Payment gateway timeout duration",
          is_active: true,
        } satisfies IEcommerceSystemSetting.ICreate,
      },
    );
  typia.assert(systemSetting);
  // Validate response fields
  TestValidator.equals(
    "setting_key matches",
    systemSetting.setting_key,
    "payment.gateway.timeout",
  );
  TestValidator.equals(
    "value_type is string",
    systemSetting.value_type,
    "string",
  );
  TestValidator.equals(
    "setting_value matches",
    systemSetting.setting_value,
    "30s",
  );
  TestValidator.equals(
    "description matches",
    systemSetting.description,
    "Payment gateway timeout duration",
  );
  TestValidator.predicate(
    "is_active is true",
    systemSetting.is_active === true,
  );
  // Validate generated fields
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      systemSetting.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(systemSetting.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(systemSetting.updated_at).getTime()),
  );
  TestValidator.predicate(
    "deleted_at is null",
    systemSetting.deleted_at === null,
  );
}
